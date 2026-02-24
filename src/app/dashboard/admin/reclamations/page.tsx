"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { RECLAMATION_STATUTS } from "@/lib/statuts";

type Reclamation = {
  id: string;
  client_email: string;
  sujet: string;
  message: string;
  statut: string;
  created_at: string;
  client?: { prenom: string; nom: string; email: string };
};

export default function AdminReclamations() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const [reclamations, setReclamations] = useState<Reclamation[]>([]);
  const [filterStatut, setFilterStatut] = useState<string>("");

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "admin")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role !== "admin") return;
    const url = filterStatut ? `/api/reclamations?statut=${filterStatut}` : "/api/reclamations";
    fetch(url, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setReclamations)
      .catch(() => {});
  }, [role, filterStatut]);

  const setStatut = async (id: string, statut: string) => {
    const r = await fetch(`/api/reclamations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ statut }),
    });
    if (r.ok) {
      const data = await r.json();
      setReclamations((prev) => prev.map((rec) => (rec.id === id ? { ...rec, ...data } : rec)));
    }
  };

  const clientEmail = (r: Reclamation) => r.client?.email ?? r.client_email ?? "—";
  const dateStr = (s: string) => (s ? new Date(s).toLocaleDateString("fr-FR") : "—");

  if (!isAuthenticated || role !== "admin") return null;

  return (
    <DashboardLayout role="admin" title="Gérer les réclamations">
      <p className="text-slate-600 text-sm mb-6">Consulter et traiter les réclamations envoyées par les clients.</p>
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
        <h3 className="text-base font-semibold text-slate-800 mb-4">Liste des réclamations</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => setFilterStatut("")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!filterStatut ? "bg-primary-100 text-primary-800" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            Toutes
          </button>
          {["en_attente", "en_cours", "traitee"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatut(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filterStatut === s ? "bg-primary-100 text-primary-800" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {RECLAMATION_STATUTS[s]}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          {reclamations.map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800">{r.sujet}</p>
                <p className="text-sm text-slate-600 mt-1">{r.message}</p>
                <p className="text-xs text-slate-400 mt-2">{clientEmail(r)} — {dateStr(r.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    r.statut === "traitee" ? "bg-green-100 text-green-800"
                    : r.statut === "en_cours" ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {RECLAMATION_STATUTS[r.statut] ?? r.statut}
                </span>
                {r.statut === "en_attente" && (
                  <button type="button" onClick={() => setStatut(r.id, "en_cours")} className="text-sm text-primary-600 hover:underline">Prendre en charge</button>
                )}
                {(r.statut === "en_attente" || r.statut === "en_cours") && (
                  <button type="button" onClick={() => setStatut(r.id, "traitee")} className="text-sm text-green-600 hover:underline">Marquer traitée</button>
                )}
              </div>
            </div>
          ))}
        </div>
        {reclamations.length === 0 && <p className="text-slate-500 text-sm py-6 text-center">Aucune réclamation.</p>}
      </section>
    </DashboardLayout>
  );
}
