"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

type TypeCredit = {
  id: string;
  nom: string;
  description: string | null;
  duree_max: string | null;
  montant_max: string | null;
};

const DOCS_PAR_TYPE: Record<string, string[]> = {
  "Crédit à la consommation": [
    "Pièce d'identité",
    "Justificatif de domicile",
    "Justificatifs de revenus",
    "RIB",
  ],
  "Crédit immobilier": [
    "Pièce d'identité",
    "Justificatif de domicile",
    "Justificatifs de revenus (3 derniers bulletins)",
    "Avis d'imposition",
    "Offre de prêt en cours le cas échéant",
    "Compromis ou promesse de vente si achat",
  ],
  "Crédit professionnel": [
    "Statuts et Kbis",
    "Comptes annuels récents",
    "Prévisionnel / business plan",
    "Justificatifs de revenus des dirigeants",
  ],
};

const TYPE_ICONS: Record<string, string> = {
  "Crédit à la consommation": "🛒",
  "Crédit immobilier": "🏠",
  "Crédit professionnel": "💼",
};

export default function ClientDocumentation() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const [types, setTypes] = useState<TypeCredit[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "client")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role === "client") {
      fetch("/api/types-credit", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          setTypes(data);
          if (data[0]?.id) setOpenId(data[0].id);
        })
        .catch(() => {});
    }
  }, [role]);

  if (!isAuthenticated || role !== "client") return null;

  return (
    <DashboardLayout role="client" title="Documentation & types de crédit">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Documentation & types de crédit</h1>
        <p className="mt-1 text-slate-600 text-sm max-w-2xl">
          Découvrez les types de crédit proposés, leurs conditions et la liste des documents à fournir pour chaque dossier.
        </p>
      </div>

      {/* Tips */}
      <section className="mb-8 rounded-xl border border-primary-100 bg-primary-50/40 p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-2">Comment ça marche</h2>
        <ul className="text-sm text-slate-700 space-y-1.5">
          <li className="flex items-center gap-2">
            <span className="text-primary-600 font-medium">1.</span> Choisissez un type de crédit et consultez les documents demandés ci-dessous.
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary-600 font-medium">2.</span> Déposez votre demande depuis <Link href="/dashboard/client/demande" className="font-medium text-primary-700 hover:underline">Ma demande</Link>.
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary-600 font-medium">3.</span> Envoyez vos justificatifs dans la section <Link href="/dashboard/client/documents" className="font-medium text-primary-700 hover:underline">Documents</Link>.
          </li>
        </ul>
      </section>

      {/* Types de crédit */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Types de crédit</h2>
        {types.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 shadow-card text-center">
            <p className="text-slate-500 text-sm">Aucun type de crédit configuré pour le moment.</p>
            <p className="mt-2 text-slate-400 text-xs">Revenez plus tard ou contactez l&apos;équipe.</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl">
            {types.map((t) => {
              const isOpen = openId === t.id;
              const docs = DOCS_PAR_TYPE[t.nom] ?? [
                "Pièce d'identité",
                "Justificatif de domicile",
                "Justificatifs de revenus",
              ];
              return (
                <div
                  key={t.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition hover:border-slate-300"
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : t.id)}
                    className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50/50 transition"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-2xl">
                      {TYPE_ICONS[t.nom] ?? "📋"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800">{t.nom}</h3>
                      <p className="text-slate-500 text-sm mt-0.5 truncate">
                        {t.duree_max || "—"} · {t.montant_max || "—"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition ${
                        isOpen ? "bg-primary-100 text-primary-700 rotate-180" : "bg-slate-100"
                      }`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 bg-slate-50/30 px-5 pb-6 pt-4">
                      <p className="text-slate-600 text-sm">{t.description || "—"}</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg bg-white border border-slate-100 px-4 py-3">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Durée max</p>
                          <p className="mt-0.5 font-semibold text-slate-800">{t.duree_max || "—"}</p>
                        </div>
                        <div className="rounded-lg bg-white border border-slate-100 px-4 py-3">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Montant</p>
                          <p className="mt-0.5 font-semibold text-slate-800">{t.montant_max || "—"}</p>
                        </div>
                      </div>
                      <div className="mt-5">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <span className="text-slate-400">📄</span> Documents à fournir
                        </h4>
                        <ul className="space-y-2">
                          {docs.map((d, i) => (
                            <li
                              key={i}
                              className="flex items-center gap-3 rounded-lg bg-white border border-slate-100 px-4 py-2.5 text-sm text-slate-700"
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                                {i + 1}
                              </span>
                              {d}
                            </li>
                          ))}
                        </ul>
                        <Link
                          href="/dashboard/client/documents"
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition"
                        >
                          Déposer mes documents
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick link */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Prêt à déposer votre dossier ?</h2>
            <p className="text-slate-600 text-sm mt-0.5">Créez une demande puis envoyez vos documents.</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard/client/demande"
              className="rounded-xl border-2 border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-medium text-primary-700 hover:bg-primary-100 transition"
            >
              Ma demande
            </Link>
            <Link
              href="/dashboard/client/documents"
              className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition"
            >
              Documents
            </Link>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
