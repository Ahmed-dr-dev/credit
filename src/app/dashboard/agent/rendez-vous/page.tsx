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

const STATUT_STYLE: Record<string, string> = {
  confirme: "bg-green-100 text-green-800",
  passe: "bg-slate-100 text-slate-600",
  reporte: "bg-amber-100 text-amber-800",
  alt_agent: "bg-blue-100 text-blue-800",
  contre_client: "bg-orange-100 text-orange-800",
  demande: "bg-primary-100 text-primary-800",
};

export default function AgentRendezVous() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const [rdvs, setRdvs] = useState<RDV[]>([]);
  const [filterStatut, setFilterStatut] = useState<string>("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [dateAlt, setDateAlt] = useState("");

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "agent")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  const load = () => {
    if (role !== "agent") return;
    const url = filterStatut ? `/api/rendez-vous?statut=${filterStatut}` : "/api/rendez-vous";
    fetch(url, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setRdvs)
      .catch(() => {});
  };

  useEffect(() => { load(); }, [role, filterStatut]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setActionId(null);
      setDateAlt("");
    }
  };

  const filtered = filterStatut ? rdvs.filter((r) => r.statut === filterStatut) : rdvs;
  const dateStr = (s: string | null) =>
    s ? new Date(s).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "—";

  if (!isAuthenticated || role !== "agent") return null;

  return (
    <DashboardLayout role="agent" title="Gestion des rendez-vous">
      <p className="text-slate-600 text-sm mb-6">
        Planifiez et gérez les rendez-vous avec les clients. Proposez une alternative ou confirmez leur demande.
      </p>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["", "demande", "contre_client", "alt_agent", "confirme", "passe"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilterStatut(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filterStatut === s
                ? "bg-primary-100 text-primary-800"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s === "" ? "Tous" : RDV_STATUTS[s]}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.length === 0 && (
          <p className="text-slate-500 text-sm py-8 text-center bg-white rounded-xl border border-slate-200">
            Aucun rendez-vous.
          </p>
        )}

        {filtered.map((r) => (
          <div
            key={r.id}
            className={`bg-white rounded-xl border p-5 shadow-card flex flex-col gap-4 ${
              r.statut === "contre_client" ? "border-orange-200" : "border-slate-200"
            }`}
          >
            {/* En-tête */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">
                  {r.client ? `${r.client.prenom} ${r.client.nom}` : "—"}
                </p>
                <p className="text-xs text-slate-500">{r.client?.email ?? "—"}</p>
                <p className="text-sm text-slate-600 mt-1">{r.motif || "—"}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${STATUT_STYLE[r.statut] ?? "bg-slate-100 text-slate-700"}`}>
                {RDV_STATUTS[r.statut] ?? r.statut}
              </span>
            </div>

            {/* Dates */}
            <div className="text-xs text-slate-500 space-y-0.5 border-t border-slate-100 pt-3">
              <p>Date demandée par le client : <span className="font-medium text-slate-700">{dateStr(r.date_demandee)}</span></p>
              {r.date_proposee && (
                <p>Dernière alternative proposée par le conseiller : <span className="font-medium text-slate-700">{dateStr(r.date_proposee)}</span></p>
              )}
            </div>

            {/* Alerte contre-proposition client */}
            {r.statut === "contre_client" && (
              <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm text-orange-800">
                Le client a contre-proposé une nouvelle date :{" "}
                <strong>{dateStr(r.date_demandee)}</strong>. Confirmez ou proposez une autre alternative.
              </div>
            )}

            {/* Actions */}
            {(r.statut === "demande" || r.statut === "contre_client") && (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => patch(r.id, { statut: "confirme" })}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition"
                >
                  Confirmer
                </button>
                <button
                  type="button"
                  onClick={() => { setActionId(r.id); setDateAlt(""); }}
                  className="px-4 py-2 rounded-lg bg-primary-50 text-primary-700 border border-primary-200 text-sm font-medium hover:bg-primary-100 transition"
                >
                  Proposer une alternative
                </button>
              </div>
            )}

            {r.statut === "confirme" && (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => patch(r.id, { statut: "passe" })}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition"
                >
                  Marquer comme passé
                </button>
              </div>
            )}

            {/* Formulaire proposition alternative */}
            {actionId === r.id && (
              <div className="rounded-xl bg-primary-50 border border-primary-100 p-4 space-y-3">
                <p className="text-sm font-medium text-primary-800">Proposer une date alternative</p>
                <input
                  type="datetime-local"
                  value={dateAlt}
                  min={new Date(Date.now() + 86400000).toISOString().slice(0, 16)}
                  onChange={(e) => setDateAlt(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 outline-none text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!dateAlt}
                    onClick={() =>
                      patch(r.id, {
                        statut: "alt_agent",
                        date_proposee: new Date(dateAlt).toISOString(),
                      })
                    }
                    className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition"
                  >
                    Envoyer la proposition
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActionId(null); setDateAlt(""); }}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50 transition"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
