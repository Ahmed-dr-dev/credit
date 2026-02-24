"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { DEMANDE_STATUTS } from "@/lib/statuts";

const STATUT_OPTIONS = ["en_cours_etude", "en_attente_infos", "validee", "refusee"] as const;

type DemandeRow = {
  id: string;
  client: { prenom: string; nom: string; email: string } | null;
  type_nom: string | null;
  montant: string;
  duree: string;
  statut: string;
  created_at: string;
};

function normalizeClient(c: unknown): DemandeRow["client"] {
  if (!c || typeof c !== "object") return null;
  const o = Array.isArray(c) ? (c as unknown[])[0] : c;
  if (!o || typeof o !== "object") return null;
  const x = o as Record<string, unknown>;
  return {
    prenom: String(x.prenom ?? ""),
    nom: String(x.nom ?? ""),
    email: String(x.email ?? ""),
  };
}

function normalizeDemande(d: Record<string, unknown>): DemandeRow {
  return {
    id: String(d.id),
    client: normalizeClient(d.client),
    type_nom: d.type_nom != null ? String(d.type_nom) : null,
    montant: String(d.montant ?? ""),
    duree: String(d.duree ?? ""),
    statut: String(d.statut ?? ""),
    created_at: String(d.created_at ?? ""),
  };
}

export default function AgentDemandes() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const [demandes, setDemandes] = useState<DemandeRow[]>([]);
  const [filterStatut, setFilterStatut] = useState<string>("");
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "agent")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role !== "agent") return;
    setLoadingData(true);
    setError(null);
    const url = filterStatut ? `/api/demandes?statut=${encodeURIComponent(filterStatut)}` : "/api/demandes";
    fetch(url, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 401 ? "Non authentifié" : "Erreur lors du chargement");
        return r.json();
      })
      .then((data: unknown) => {
        const list = Array.isArray(data) ? data : [];
        setDemandes(list.map((d) => normalizeDemande(d as Record<string, unknown>)));
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Erreur réseau");
        setDemandes([]);
      })
      .finally(() => setLoadingData(false));
  }, [role, filterStatut]);

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

  const clientName = (d: DemandeRow) =>
    d.client?.prenom || d.client?.nom ? `${d.client.prenom} ${d.client.nom}`.trim() : "—";

  if (!isAuthenticated || role !== "agent") return null;

  return (
    <DashboardLayout role="agent" title="Consultation des demandes">
      <p className="text-slate-600 text-sm mb-6">
        Liste des demandes de crédit qui vous sont affectées (par l&apos;admin). Données chargées depuis le serveur.
      </p>
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
        <h3 className="text-base font-semibold text-slate-800 mb-4">Demandes affectées</h3>
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
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}
        {loadingData ? (
          <div className="py-12 text-center text-slate-500 text-sm">Chargement des demandes...</div>
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
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {demandes.map((d) => (
                <tr key={d.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-slate-800">{clientName(d)}</p>
                    <p className="text-xs text-slate-500">{d.client?.email ?? "—"}</p>
                  </td>
                  <td className="py-3 pr-4">{d.type_nom || "—"}</td>
                  <td className="py-3 pr-4">{d.montant}</td>
                  <td className="py-3 pr-4">{d.duree}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        d.statut === "validee" ? "bg-green-100 text-green-800"
                        : d.statut === "refusee" ? "bg-red-100 text-red-800"
                        : d.statut === "en_attente_infos" ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {DEMANDE_STATUTS[d.statut] ?? d.statut}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <Link href={`/dashboard/agent/dossiers?demande=${d.id}`} className="text-primary-600 hover:underline mr-2">Analyser</Link>
                    {(d.statut === "en_cours_etude" || d.statut === "en_attente_infos") && (
                      <>
                        <button type="button" onClick={() => updateStatut(d.id, "en_attente_infos")} className="text-amber-600 hover:underline mr-2">Infos compl.</button>
                        <button type="button" onClick={() => updateStatut(d.id, "validee")} className="text-green-600 hover:underline mr-2">Accepter</button>
                        <button type="button" onClick={() => updateStatut(d.id, "refusee")} className="text-red-600 hover:underline">Refuser</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        {!loadingData && demandes.length === 0 && !error && (
          <p className="text-slate-500 text-sm py-6 text-center">Aucune demande vous est affectée. L&apos;administrateur doit assigner des demandes à votre compte.</p>
        )}
      </section>
    </DashboardLayout>
  );
}
