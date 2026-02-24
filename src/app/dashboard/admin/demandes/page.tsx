"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { DEMANDE_STATUTS } from "@/lib/statuts";

const STATUT_OPTIONS = ["en_attente", "en_cours_etude", "validee", "refusee"] as const;

type DemandeRow = {
  id: string;
  montant: string;
  duree: string;
  statut: string;
  type_nom: string | null;
  responsable_id: string | null;
  client: { prenom: string; nom: string; email: string } | null;
  responsable: { prenom: string; nom: string } | null;
};

type Profile = { id: string; prenom: string; nom: string; email: string };

export default function AdminDemandes() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const [demandes, setDemandes] = useState<DemandeRow[]>([]);
  const [agents, setAgents] = useState<Profile[]>([]);
  const [filterStatut, setFilterStatut] = useState<string>("");
  const [assignId, setAssignId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "admin")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role !== "admin") return;
    const load = async () => {
      try {
        const [dRes, aRes] = await Promise.all([
          fetch("/api/demandes", { credentials: "include" }),
          fetch("/api/profiles?role=agent", { credentials: "include" }),
        ]);
        if (dRes.ok) setDemandes(await dRes.json());
        if (aRes.ok) setAgents(await aRes.json());
      } catch {
        // ignore
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [role]);

  const updateStatut = async (id: string, statut: string) => {
    const r = await fetch(`/api/demandes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ statut }),
    });
    if (r.ok) {
      const data = await r.json();
      setDemandes((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)));
    }
  };

  const assigner = async () => {
    if (!assignId || !selectedAgentId) return;
    const r = await fetch(`/api/demandes/${assignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ statut: "en_cours_etude", responsable_id: selectedAgentId }),
    });
    if (r.ok) {
      const data = await r.json();
      setDemandes((prev) => prev.map((d) => (d.id === assignId ? { ...d, ...data } : d)));
      setAssignId(null);
      setSelectedAgentId("");
    }
  };

  const filtered = filterStatut ? demandes.filter((d) => d.statut === filterStatut) : demandes;
  const clientName = (d: DemandeRow) =>
    d.client ? `${d.client.prenom} ${d.client.nom}` : "—";
  const respName = (d: DemandeRow) =>
    d.responsable ? `${d.responsable.prenom} ${d.responsable.nom}` : "—";

  if (!isAuthenticated || role !== "admin") return null;

  return (
    <DashboardLayout role="admin" title="Demandes de crédit">
      <p className="text-slate-600 text-sm mb-6">
        Suivi global des demandes, supervision (valider / rejeter), affectation des dossiers aux
        responsables bancaires.
      </p>
      <div className="space-y-8">
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Suivi des demandes</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={() => setFilterStatut("")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!filterStatut ? "bg-primary-100 text-primary-800" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              Toutes
            </button>
            {STATUT_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatut(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filterStatut === s ? "bg-primary-100 text-primary-800" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {DEMANDE_STATUTS[s]}
              </button>
            ))}
          </div>
          {loadingData ? (
            <p className="text-slate-500 py-6">Chargement...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="pb-3 pr-4 font-medium">Client</th>
                    <th className="pb-3 pr-4 font-medium">Type</th>
                    <th className="pb-3 pr-4 font-medium">Montant</th>
                    <th className="pb-3 pr-4 font-medium">Durée</th>
                    <th className="pb-3 pr-4 font-medium">Statut</th>
                    <th className="pb-3 pr-4 font-medium">Responsable</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => (
                    <tr key={d.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4">{clientName(d)}</td>
                      <td className="py-3 pr-4">{d.type_nom || "—"}</td>
                      <td className="py-3 pr-4">{d.montant}</td>
                      <td className="py-3 pr-4">{d.duree}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            d.statut === "validee"
                              ? "bg-green-100 text-green-800"
                              : d.statut === "refusee"
                              ? "bg-red-100 text-red-800"
                              : d.statut === "en_cours_etude"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {DEMANDE_STATUTS[d.statut] ?? d.statut}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{respName(d)}</td>
                      <td className="py-3 text-right">
                        {d.statut === "en_attente" && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateStatut(d.id, "validee")}
                              className="text-green-600 hover:underline mr-2"
                            >
                              Valider
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStatut(d.id, "refusee")}
                              className="text-red-600 hover:underline mr-2"
                            >
                              Rejeter
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAssignId(d.id);
                                setSelectedAgentId(d.responsable_id ?? "");
                              }}
                              className="text-primary-600 hover:underline"
                            >
                              Affecter
                            </button>
                          </>
                        )}
                        {d.statut === "en_cours_etude" && (
                          <button
                            type="button"
                            onClick={() => {
                              setAssignId(d.id);
                              setSelectedAgentId(d.responsable_id ?? "");
                            }}
                            className="text-primary-600 hover:underline"
                          >
                            Changer
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loadingData && filtered.length === 0 && (
            <p className="text-slate-500 text-sm py-6 text-center">Aucune demande.</p>
          )}
        </section>

        {assignId && (
          <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Affectation du dossier</h3>
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 mb-1">Responsable</label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 outline-none"
                >
                  <option value="">Sélectionner</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.prenom} {a.nom}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={assigner}
                disabled={!selectedAgentId}
                className="px-4 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                Affecter
              </button>
              <button
                type="button"
                onClick={() => {
                  setAssignId(null);
                  setSelectedAgentId("");
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
