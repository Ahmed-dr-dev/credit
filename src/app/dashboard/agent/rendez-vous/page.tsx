"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { RDV_STATUTS } from "@/lib/statuts";

type RDV = {
  id: string;
  client: { prenom: string; nom: string; email: string } | null;
  date_demandee: string | null;
  date_proposee: string | null;
  statut: string;
  motif: string | null;
};

export default function AgentRendezVous() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const [rdvs, setRdvs] = useState<RDV[]>([]);
  const [filterStatut, setFilterStatut] = useState<string>("");
  const [proposeId, setProposeId] = useState<string | null>(null);
  const [dateProposee, setDateProposee] = useState("");

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "agent")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role !== "agent") return;
    const url = filterStatut ? `/api/rendez-vous?statut=${filterStatut}` : "/api/rendez-vous";
    fetch(url, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setRdvs)
      .catch(() => {});
  }, [role, filterStatut]);

  const updateStatut = async (id: string, statut: string, dateProposeeVal?: string) => {
    const body = dateProposeeVal ? { statut, date_proposee: dateProposeeVal } : { statut };
    const r = await fetch(`/api/rendez-vous/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (r.ok) {
      const data = await r.json();
      setRdvs((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
      setProposeId(null);
      setDateProposee("");
    }
  };

  const filtered = filterStatut ? rdvs.filter((r) => r.statut === filterStatut) : rdvs;
  const clientName = (r: RDV) => r.client ? `${r.client.prenom} ${r.client.nom}` : "—";
  const dateStr = (s: string | null) => (s ? new Date(s).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—");

  if (!isAuthenticated || role !== "agent") return null;

  return (
    <DashboardLayout role="agent" title="Gestion des rendez-vous">
      <p className="text-slate-600 text-sm mb-6">
        Planifier et gérer les rendez-vous avec les clients : valider ou proposer des dates.
      </p>
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
        <h3 className="text-base font-semibold text-slate-800 mb-4">Rendez-vous</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => setFilterStatut("")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!filterStatut ? "bg-primary-100 text-primary-800" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            Tous
          </button>
          {["demande", "confirme", "reporte", "passe"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatut(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filterStatut === s ? "bg-primary-100 text-primary-800" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {RDV_STATUTS[s]}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800">{clientName(r)}</p>
                <p className="text-xs text-slate-500">{r.client?.email ?? "—"}</p>
                <p className="text-sm text-slate-600 mt-1">{r.motif || "—"}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Demandé : {dateStr(r.date_demandee)}
                  {r.date_proposee && ` — Proposé : ${dateStr(r.date_proposee)}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    r.statut === "confirme" ? "bg-green-100 text-green-800"
                    : r.statut === "passe" ? "bg-slate-100 text-slate-700"
                    : r.statut === "reporte" ? "bg-amber-100 text-amber-800"
                    : "bg-primary-100 text-primary-800"
                  }`}
                >
                  {RDV_STATUTS[r.statut] ?? r.statut}
                </span>
                {r.statut === "demande" && (
                  <>
                    <button type="button" onClick={() => { setProposeId(r.id); setDateProposee(""); }} className="text-sm text-primary-600 hover:underline">Proposer date</button>
                    <button type="button" onClick={() => updateStatut(r.id, "confirme")} className="text-sm text-green-600 hover:underline">Confirmer</button>
                  </>
                )}
                {r.statut === "confirme" && (
                  <button type="button" onClick={() => updateStatut(r.id, "passe")} className="text-sm text-slate-600 hover:underline">Marquer passé</button>
                )}
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && <p className="text-slate-500 text-sm py-6 text-center">Aucun rendez-vous.</p>}
      </section>

      {proposeId && (
        <section className="mt-6 bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Proposer une date</h3>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Date et heure (ISO)</label>
              <input
                type="datetime-local"
                value={dateProposee}
                onChange={(e) => setDateProposee(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => dateProposee && updateStatut(proposeId, "confirme", new Date(dateProposee).toISOString())}
              disabled={!dateProposee.trim()}
              className="px-4 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              Envoyer la proposition
            </button>
            <button type="button" onClick={() => { setProposeId(null); setDateProposee(""); }} className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50">Annuler</button>
          </div>
        </section>
      )}
    </DashboardLayout>
  );
}
