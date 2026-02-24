"use client";

import { useState, useEffect, Suspense } from "react";
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
  });

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "client")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role !== "client") return;
    Promise.all([
      fetch("/api/agents", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/demandes", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/rendez-vous", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
    ]).then(([a, d, r]) => {
      setAgents(a);
      setDemandes(d);
      setRdvs(r);
    });
  }, [role]);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      ...(demandeParam && { demande_id: demandeParam }),
      ...(motifParam && { motif: decodeURIComponent(motifParam) }),
    }));
  }, [demandeParam, motifParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agent_id || !form.motif.trim()) return;
    const r = await fetch("/api/rendez-vous", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        agent_id: form.agent_id,
        demande_id: form.demande_id || null,
        motif: form.motif.trim(),
      }),
    });
    if (r.ok) {
      const data = await r.json();
      setRdvs((prev) => [data, ...prev]);
      setForm({ agent_id: "", demande_id: "", motif: "Discussion statut dossier crédit" });
    }
  };

  const dateStr = (s: string | null) =>
    s ? new Date(s).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "—";

  if (!isAuthenticated || role !== "client") return null;

  const fromDocs = searchParams.get("fromDocs") === "1";

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
            Vos documents sont déposés. Réservez un rendez-vous pour faire le point sur votre demande avec votre conseiller.
          </p>
        </div>
      )}

      <div className="space-y-8 max-w-2xl">
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h3 className="text-base font-semibold text-slate-800 mb-2">Demander un rendez-vous</h3>
          <p className="text-slate-600 text-sm mb-4">
            Choisissez votre conseiller, liez éventuellement votre demande de crédit et indiquez le motif (ex. discussion statut dossier).
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
                  Lier à une demande (recommandé pour discuter du statut)
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
              className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700"
            >
              Demander un rendez-vous
            </button>
          </form>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h3 className="text-base font-semibold text-slate-800 mb-2">Mes rendez-vous</h3>
          <p className="text-slate-600 text-sm mb-4">Liste des rendez-vous à venir et passés.</p>
          {rdvs.length === 0 ? (
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-6 text-center">
              <p className="text-slate-600 text-sm">Aucun rendez-vous pour le moment.</p>
              <p className="text-xs text-slate-500 mt-1">Utilisez le formulaire ci-dessus pour en demander un.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {rdvs.map((r) => (
                <li
                  key={r.id}
                  className="flex justify-between items-start p-4 rounded-lg border border-slate-200"
                >
                  <div>
                    <p className="font-medium text-slate-800">{r.motif || "—"}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {r.agent ? `${r.agent.prenom} ${r.agent.nom}` : "—"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Demandé : {dateStr(r.date_demandee)}
                      {r.date_proposee && ` · Proposé : ${dateStr(r.date_proposee)}`}
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded bg-primary-50 text-primary-700">
                    {RDV_STATUTS[r.statut] ?? r.statut}
                  </span>
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
