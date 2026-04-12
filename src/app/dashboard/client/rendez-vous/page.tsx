"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import PageIntro from "@/components/client/PageIntro";
import { RDV_STATUTS } from "@/lib/statuts";

type Agent = { id: string; prenom: string; nom: string };
type Demande = { id: string; type_nom: string | null; montant: string };
type RDV = {
  id: string;
  statut: string;
  date_demandee: string | null;
  date_proposee: string | null;
  motif: string | null;
  agent?: { prenom: string; nom: string };
};

const STATUT_STYLE: Record<string, string> = {
  confirme: "bg-green-100 text-green-800",
  passe: "bg-slate-100 text-slate-600",
  reporte: "bg-amber-100 text-amber-800",
  alt_agent: "bg-blue-100 text-blue-800",
  contre_client: "bg-orange-100 text-orange-800",
  demande: "bg-primary-100 text-primary-800",
};

function RendezVousContent() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [rdvs, setRdvs] = useState<RDV[]>([]);

  const demandeParam = searchParams.get("demande") ?? "";
  const motifParam = searchParams.get("motif") || "";

  const [form, setForm] = useState({
    agent_id: "",
    demande_id: demandeParam,
    motif: motifParam ? decodeURIComponent(motifParam) : "Discussion statut dossier crédit",
    date_demandee: "",
  });

  // Availability check
  type Availability = "idle" | "checking" | "available" | "unavailable";
  const [availability, setAvailability] = useState<Availability>("idle");
  const [conflictInfo, setConflictInfo] = useState<string | null>(null);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Counter-proposal state
  const [contreId, setContreId] = useState<string | null>(null);
  const [contreDate, setContreDate] = useState("");

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "client")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  const load = () => {
    if (role !== "client") return;
    Promise.all([
      fetch("/api/agents", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/demandes", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/rendez-vous", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
    ]).then(([a, d, rv]) => {
      setAgents(a);
      setDemandes(d);
      setRdvs(rv);
    });
  };

  useEffect(() => { load(); }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setForm((f) => ({
      ...f,
      ...(demandeParam && { demande_id: demandeParam }),
      ...(motifParam && { motif: decodeURIComponent(motifParam) }),
    }));
  }, [demandeParam, motifParam]);

  // Check availability whenever agent or date changes (debounced 600ms)
  useEffect(() => {
    if (!form.agent_id || !form.date_demandee) {
      setAvailability("idle");
      setConflictInfo(null);
      return;
    }
    setAvailability("checking");
    setConflictInfo(null);
    if (checkTimer.current) clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({
          agent_id: form.agent_id,
          date: new Date(form.date_demandee).toISOString(),
        });
        const r = await fetch(`/api/rendez-vous/disponibilite?${qs}`, { credentials: "include" });
        const data = await r.json();
        if (data.available) {
          setAvailability("available");
        } else {
          setAvailability("unavailable");
          const d = data.conflict?.date
            ? new Date(data.conflict.date).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })
            : null;
          setConflictInfo(
            `Ce conseiller a déjà un rendez-vous ${d ? `le ${d}` : "à cet horaire"}. Veuillez choisir un créneau espacé d'au moins 1 heure.`
          );
        }
      } catch {
        setAvailability("idle");
      }
    }, 600);
  }, [form.agent_id, form.date_demandee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agent_id || !form.motif.trim()) return;
    if (availability === "unavailable") return;
    const r = await fetch("/api/rendez-vous", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        agent_id: form.agent_id,
        demande_id: form.demande_id || null,
        motif: form.motif.trim(),
        date_demandee: form.date_demandee ? new Date(form.date_demandee).toISOString() : null,
      }),
    });
    if (r.ok) {
      const data = await r.json();
      setRdvs((prev) => [data, ...prev]);
      setForm({ agent_id: "", demande_id: "", motif: "Discussion statut dossier crédit", date_demandee: "" });
    }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    const r = await fetch(`/api/rendez-vous/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (r.ok) {
      const data = await r.json();
      setRdvs((prev) => prev.map((rv) => (rv.id === id ? { ...rv, ...data } : rv)));
      setContreId(null);
      setContreDate("");
    }
  };

  const dateStr = (s: string | null) =>
    s ? new Date(s).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "—";

  if (!isAuthenticated || role !== "client") return null;

  const fromDocs = searchParams.get("fromDocs") === "1";
  const pendingAlt = rdvs.filter((r) => r.statut === "alt_agent");

  return (
    <DashboardLayout role="client" title="Rendez-vous">
      <PageIntro
        title="Rendez-vous avec la banque"
        description="Demandez un rendez-vous avec votre conseiller pour discuter du statut de votre dossier crédit."
        icon="📅"
      />

      {fromDocs && (
        <div className="mb-6 p-4 rounded-xl bg-primary-50 border border-primary-100">
          <p className="text-primary-800 text-sm font-medium">
            Vos documents sont déposés. Réservez un rendez-vous pour faire le point sur votre demande.
          </p>
        </div>
      )}

      {/* ── Alertes alternatives en attente ── */}
      {pendingAlt.map((r) => (
        <div
          key={r.id}
          className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="font-semibold text-blue-900 text-sm">
                Votre conseiller{r.agent ? ` (${r.agent.prenom} ${r.agent.nom})` : ""} propose une alternative
              </p>
              <p className="text-blue-800 text-sm mt-1">
                Nouvelle date proposée :{" "}
                <strong>{dateStr(r.date_proposee)}</strong>
              </p>
              <p className="text-blue-700 text-xs mt-0.5">
                Votre demande initiale était : {dateStr(r.date_demandee)}
              </p>
            </div>
          </div>

          {contreId === r.id ? (
            <div className="space-y-2 pt-1">
              <p className="text-sm font-medium text-blue-900">Contre-proposer une autre date :</p>
              <input
                type="datetime-local"
                value={contreDate}
                min={new Date(Date.now() + 86400000).toISOString().slice(0, 16)}
                onChange={(e) => setContreDate(e.target.value)}
                className="w-full sm:w-72 px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 outline-none text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!contreDate}
                  onClick={() =>
                    patch(r.id, {
                      statut: "contre_client",
                      date_demandee: new Date(contreDate).toISOString(),
                    })
                  }
                  className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition"
                >
                  Envoyer ma contre-proposition
                </button>
                <button
                  type="button"
                  onClick={() => { setContreId(null); setContreDate(""); }}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => patch(r.id, { statut: "confirme" })}
                className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition"
              >
                Accepter cette date
              </button>
              <button
                type="button"
                onClick={() => { setContreId(r.id); setContreDate(""); }}
                className="px-4 py-2 rounded-lg bg-white border border-blue-300 text-blue-700 text-sm font-medium hover:bg-blue-50 transition"
              >
                Proposer une autre date
              </button>
            </div>
          )}
        </div>
      ))}

      <div className="space-y-8 max-w-2xl">
        {/* ── Formulaire ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h3 className="text-base font-semibold text-slate-800 mb-2">Demander un rendez-vous</h3>
          <p className="text-slate-600 text-sm mb-4">
            Choisissez votre conseiller, précisez une date souhaitée et indiquez le motif.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Conseiller</label>
              <select
                value={form.agent_id}
                onChange={(e) => setForm((f) => ({ ...f, agent_id: e.target.value }))}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 outline-none"
              >
                <option value="">Sélectionner</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.prenom} {a.nom}
                  </option>
                ))}
              </select>
            </div>

            {demandes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Lier à une demande (recommandé)
                </label>
                <select
                  value={form.demande_id}
                  onChange={(e) => setForm((f) => ({ ...f, demande_id: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 outline-none"
                >
                  <option value="">Aucune</option>
                  {demandes.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.type_nom || "—"} — {d.montant}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date souhaitée
              </label>
              <input
                type="datetime-local"
                value={form.date_demandee}
                min={new Date(Date.now() + 86400000).toISOString().slice(0, 16)}
                onChange={(e) => setForm((f) => ({ ...f, date_demandee: e.target.value }))}
                className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 outline-none transition ${
                  availability === "unavailable"
                    ? "border-red-400 focus:ring-red-500/30 bg-red-50"
                    : availability === "available"
                    ? "border-green-400 focus:ring-green-500/30 bg-green-50"
                    : "border-slate-300 focus:ring-primary-500/30"
                }`}
              />

              {/* Availability feedback */}
              {form.date_demandee && availability === "checking" && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 animate-pulse">
                  <span className="w-3 h-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin inline-block" />
                  Vérification de la disponibilité…
                </p>
              )}
              {availability === "available" && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                  <span className="text-emerald-500">✓</span> Créneau disponible
                </p>
              )}
              {availability === "unavailable" && conflictInfo && (
                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <span className="shrink-0 mt-0.5">⚠️</span> {conflictInfo}
                </p>
              )}
              {form.date_demandee && availability === "idle" && !form.agent_id && (
                <p className="mt-1 text-xs text-slate-400">Sélectionnez un conseiller pour vérifier la disponibilité.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Motif</label>
              <textarea
                value={form.motif}
                onChange={(e) => setForm((f) => ({ ...f, motif: e.target.value }))}
                required
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 outline-none"
                placeholder="Ex. Discussion statut dossier crédit, pièces complémentaires"
              />
            </div>

            <button
              type="submit"
              disabled={availability === "unavailable" || availability === "checking"}
              className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Demander un rendez-vous
            </button>
          </form>
        </section>

        {/* ── Liste ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Mes rendez-vous</h3>
          {rdvs.length === 0 ? (
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-6 text-center">
              <p className="text-slate-600 text-sm">Aucun rendez-vous pour le moment.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {rdvs.map((r) => (
                <li
                  key={r.id}
                  className={`rounded-xl border p-4 ${
                    r.statut === "alt_agent" ? "border-blue-200 bg-blue-50/40" : "border-slate-200"
                  }`}
                >
                  <div className="flex justify-between items-start gap-3 flex-wrap">
                    <div>
                      <p className="font-medium text-slate-800">{r.motif || "—"}</p>
                      <p className="text-sm text-slate-600 mt-0.5">
                        {r.agent ? `${r.agent.prenom} ${r.agent.nom}` : "—"}
                      </p>
                      <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                        <p>Date demandée : {dateStr(r.date_demandee)}</p>
                        {r.date_proposee && (
                          <p>
                            Alternative conseiller :{" "}
                            <span className="font-medium text-blue-700">{dateStr(r.date_proposee)}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${
                        STATUT_STYLE[r.statut] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {RDV_STATUTS[r.statut] ?? r.statut}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

export default function ClientRendezVous() {
  return (
    <Suspense fallback={<div className="p-8">Chargement...</div>}>
      <RendezVousContent />
    </Suspense>
  );
}
