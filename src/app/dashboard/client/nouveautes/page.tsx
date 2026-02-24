"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { DEMANDE_STATUTS } from "@/lib/statuts";

type Nouveaute = {
  id: string;
  titre: string;
  description: string | null;
  type_nouveaute: string | null;
  demande_id: string | null;
  created_at: string;
};

type Demande = {
  id: string;
  statut: string;
  type_nom: string | null;
  montant: string;
  duree: string;
  created_at: string;
};

type RDV = {
  id: string;
  statut: string;
  date_proposee: string | null;
  motif: string | null;
  agent: { prenom: string; nom: string } | null;
  created_at: string;
};

const DOCS_COMPLEMENTAIRES_TYPE = "documents_complementaires";

export default function ClientNouveautes() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const [nouveautes, setNouveautes] = useState<Nouveaute[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [rdvs, setRdvs] = useState<RDV[]>([]);

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "client")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role !== "client") return;
    Promise.all([
      fetch("/api/nouveautes", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/demandes", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/rendez-vous", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
    ]).then(([n, d, r]) => {
      setNouveautes(n);
      setDemandes(d);
      setRdvs(r);
    }).catch(() => {});
  }, [role]);

  if (!isAuthenticated || role !== "client") return null;

  const demande = demandes[0] ?? null;
  const rdvConfirmes = rdvs.filter((r) => r.statut === "confirme" && r.date_proposee);
  const docsComplementaires = nouveautes.filter((n) => n.type_nouveaute === DOCS_COMPLEMENTAIRES_TYPE);
  const autresNouveautes = nouveautes.filter((n) => n.type_nouveaute !== DOCS_COMPLEMENTAIRES_TYPE);

  const formatDate = (s: string | null) =>
    s ? new Date(s).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <DashboardLayout role="client" title="Nouveautés">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Nouveautés & suivi</h1>
        <p className="mt-1 text-slate-600 text-sm">
          Rendez-vous fixés par votre conseiller, résultat de votre demande et documents à compléter.
        </p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Résultat de la demande */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <span>📋</span> Résultat de votre demande
          </h2>
          {demande ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-600">
                  {demande.type_nom || "Crédit"} · {demande.montant} · {demande.duree}
                </p>
                <p className="mt-1">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                      demande.statut === "validee" ? "bg-green-100 text-green-800"
                      : demande.statut === "refusee" ? "bg-red-100 text-red-800"
                      : demande.statut === "en_attente_infos" ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {DEMANDE_STATUTS[demande.statut] ?? demande.statut}
                  </span>
                </p>
              </div>
              <Link
                href="/dashboard/client/demande"
                className="text-sm font-medium text-primary-600 hover:underline"
              >
                Voir le détail →
              </Link>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Aucune demande déposée.</p>
          )}
        </section>

        {/* Rendez-vous fixés par l'agent */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <span>📅</span> Rendez-vous fixés par votre conseiller
          </h2>
          {rdvConfirmes.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucun rendez-vous confirmé pour le moment.</p>
          ) : (
            <ul className="space-y-3">
              {rdvConfirmes.map((r) => (
                <li key={r.id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                  <p className="font-medium text-slate-800">
                    {formatDate(r.date_proposee)}
                  </p>
                  {r.agent && (
                    <p className="text-sm text-slate-600 mt-0.5">
                      Avec {r.agent.prenom} {r.agent.nom}
                    </p>
                  )}
                  {r.motif && <p className="text-sm text-slate-500 mt-1">{r.motif}</p>}
                  <Link
                    href="/dashboard/client/rendez-vous"
                    className="text-sm text-primary-600 hover:underline mt-2 inline-block"
                  >
                    Voir tous les rendez-vous →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Documents complémentaires demandés par l'agent */}
        {docsComplementaires.length > 0 && (
          <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 shadow-card">
            <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <span>📄</span> Documents complémentaires à fournir
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              Votre conseiller a demandé les documents suivants. Déposez-les dans la section Documents.
            </p>
            <ul className="space-y-4">
              {docsComplementaires.map((n) => (
                <li key={n.id} className="rounded-lg border border-amber-200 bg-white p-4">
                  <h3 className="font-medium text-slate-800">{n.titre}</h3>
                  <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{n.description || "—"}</div>
                  <p className="text-xs text-slate-500 mt-2">{new Date(n.created_at).toLocaleDateString("fr-FR")}</p>
                  <Link
                    href="/dashboard/client/documents"
                    className="mt-3 inline-block rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 transition"
                  >
                    Déposer les documents
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Autres nouveautés */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <span>✨</span> Autres actualités
          </h2>
          {autresNouveautes.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucune autre nouveauté pour le moment.</p>
          ) : (
            <ul className="space-y-4">
              {autresNouveautes.map((n) => (
                <article key={n.id} className="rounded-lg border border-slate-100 p-4">
                  <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                    {n.type_nouveaute || "Info"}
                  </span>
                  <h3 className="mt-2 font-semibold text-slate-800">{n.titre}</h3>
                  <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{n.description || ""}</p>
                  <p className="mt-2 text-xs text-slate-400">{new Date(n.created_at).toLocaleDateString("fr-FR")}</p>
                </article>
              ))}
            </ul>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
