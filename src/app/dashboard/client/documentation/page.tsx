"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { DEMANDE_STATUTS } from "@/lib/statuts";

type TypeCredit = {
  id: string;
  nom: string;
  description: string | null;
  duree_max: string | null;
  montant_max: string | null;
};

type Demande = {
  id: string;
  montant: string;
  duree: string | null;
  statut: string;
  type_nom: string | null;
  created_at: string;
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

const STATUT_STEPS = [
  { key: "en_attente", label: "En attente" },
  { key: "en_cours_etude", label: "En cours d'étude" },
  { key: "en_attente_infos", label: "Infos complémentaires" },
  { key: "validee", label: "Validée" },
];

function parseMontant(s: string): number {
  return parseFloat(s.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
}

function monthsBetween(start: Date, end: Date): number {
  return Math.max(
    0,
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  );
}

// ── Mini bar chart (SVG, no external lib) ──────────────────────────────────
function EcheancesChart({ paid, remaining }: { paid: number; remaining: number }) {
  const total = paid + remaining;
  if (total === 0) return null;

  const BAR_W = 18;
  const BAR_GAP = 4;
  const MAX_H = 80;
  const maxVal = Math.max(paid, remaining, 1);
  const width = 2 * BAR_W + BAR_GAP + 40;

  return (
    <svg width={width} height={MAX_H + 30} className="overflow-visible">
      {/* Paid bar */}
      <rect
        x={0}
        y={MAX_H - (paid / maxVal) * MAX_H}
        width={BAR_W}
        height={(paid / maxVal) * MAX_H}
        rx={4}
        className="fill-slate-300"
      />
      <text x={BAR_W / 2} y={MAX_H + 14} textAnchor="middle" fontSize={10} className="fill-slate-500">
        Payées
      </text>
      <text x={BAR_W / 2} y={MAX_H - (paid / maxVal) * MAX_H - 4} textAnchor="middle" fontSize={11} fontWeight="600" className="fill-slate-600">
        {paid}
      </text>

      {/* Remaining bar */}
      <rect
        x={BAR_W + BAR_GAP}
        y={MAX_H - (remaining / maxVal) * MAX_H}
        width={BAR_W}
        height={(remaining / maxVal) * MAX_H}
        rx={4}
        className="fill-primary-500"
      />
      <text x={BAR_W + BAR_GAP + BAR_W / 2} y={MAX_H + 14} textAnchor="middle" fontSize={10} className="fill-slate-500">
        Restantes
      </text>
      <text x={BAR_W + BAR_GAP + BAR_W / 2} y={MAX_H - (remaining / maxVal) * MAX_H - 4} textAnchor="middle" fontSize={11} fontWeight="600" className="fill-primary-700">
        {remaining}
      </text>
    </svg>
  );
}

export default function ClientDocumentation() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const [types, setTypes] = useState<TypeCredit[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [demandes, setDemandes] = useState<Demande[]>([]);

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "client")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role !== "client") return;
    fetch("/api/types-credit", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setTypes(data);
        if (data[0]?.id) setOpenId(data[0].id);
      })
      .catch(() => {});
    fetch("/api/demandes", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setDemandes)
      .catch(() => {});
  }, [role]);

  if (!isAuthenticated || role !== "client") return null;

  const derniere = demandes[0] ?? null;
  const hasActive = demandes.some((d) => !["refusee"].includes(d.statut));
  const hasApproved = demandes.some((d) => d.statut === "validee");
  const canNewDemand = !hasActive;

  // ── Échéances calculation ──────────────────────────────────────
  const echeances = useMemo(() => {
    const approved = demandes.find((d) => d.statut === "validee");
    if (!approved || !approved.duree) return null;

    const endDate = new Date(approved.duree);
    const startDate = new Date(approved.created_at);
    const now = new Date();

    if (isNaN(endDate.getTime())) return null;

    const totalMonths = monthsBetween(startDate, endDate);
    const paidMonths = Math.min(monthsBetween(startDate, now), totalMonths);
    const remainingMonths = totalMonths - paidMonths;
    const montant = parseMontant(approved.montant);
    const mensualite = totalMonths > 0 ? montant / totalMonths : 0;
    const restantDu = mensualite * remainingMonths;
    const progressPct = totalMonths > 0 ? Math.round((paidMonths / totalMonths) * 100) : 0;

    return {
      totalMonths,
      paidMonths,
      remainingMonths,
      mensualite,
      restantDu,
      progressPct,
      montant,
      endDate,
      type: approved.type_nom,
    };
  }, [demandes]);

  // ── Status step index ──────────────────────────────────────────
  const currentStep = derniere
    ? derniere.statut === "refusee"
      ? -1
      : STATUT_STEPS.findIndex((s) => s.key === derniere.statut)
    : -2;

  return (
    <DashboardLayout role="client" title="Documentation & types de crédit">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Documentation & Suivi crédit</h1>
        <p className="mt-1 text-slate-600 text-sm max-w-2xl">
          Consultez vos types de crédit, suivez votre dossier et visualisez votre plan de remboursement.
        </p>
      </div>

      {/* ── SUIVI DE DEMANDE ─────────────────────────────────────── */}
      {derniere ? (
        <section className="mb-8 rounded-xl border border-slate-200 bg-white shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Suivi de ma demande</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {derniere.type_nom || "—"} · {derniere.montant}
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              derniere.statut === "validee" ? "bg-green-100 text-green-800"
              : derniere.statut === "refusee" ? "bg-red-100 text-red-800"
              : derniere.statut === "en_attente_infos" ? "bg-amber-100 text-amber-800"
              : "bg-primary-100 text-primary-800"
            }`}>
              {DEMANDE_STATUTS[derniere.statut] ?? derniere.statut}
            </span>
          </div>

          <div className="px-6 py-5">
            {derniere.statut === "refusee" ? (
              <div className="rounded-lg bg-red-50 border border-red-100 p-4 text-sm text-red-800">
                Votre demande a été refusée. Vous pouvez contacter votre conseiller via un rendez-vous pour connaître les motifs.
              </div>
            ) : (
              <div className="flex items-center gap-0">
                {STATUT_STEPS.map((step, i) => {
                  const done = i < currentStep;
                  const active = i === currentStep;
                  return (
                    <div key={step.key} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition ${
                          active ? "border-primary-600 bg-primary-600 text-white"
                          : done ? "border-primary-400 bg-primary-100 text-primary-700"
                          : "border-slate-200 bg-white text-slate-400"
                        }`}>
                          {done ? "✓" : i + 1}
                        </div>
                        <span className={`mt-1.5 text-[10px] text-center leading-tight w-16 ${
                          active ? "text-primary-700 font-semibold"
                          : done ? "text-primary-600"
                          : "text-slate-400"
                        }`}>
                          {step.label}
                        </span>
                      </div>
                      {i < STATUT_STEPS.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-1 mb-5 ${i < currentStep ? "bg-primary-400" : "bg-slate-200"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="mb-8 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-slate-600 text-sm font-medium">Aucune demande en cours</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">Déposez votre première demande de crédit pour voir le suivi ici.</p>
          <Link href="/dashboard/client/demande" className="inline-flex px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition">
            Déposer une demande →
          </Link>
        </section>
      )}

      {/* ── ÉLIGIBILITÉ NOUVELLE DEMANDE ─────────────────────────── */}
      <section className={`mb-8 rounded-xl border p-5 ${canNewDemand ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">{canNewDemand ? "✅" : "⏳"}</span>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              {canNewDemand ? "Vous pouvez déposer une nouvelle demande" : "Nouvelle demande non disponible"}
            </h2>
            <p className={`text-sm mt-1 ${canNewDemand ? "text-green-800" : "text-amber-800"}`}>
              {canNewDemand
                ? "Aucune demande active n'est en cours. Vous êtes éligible pour soumettre un nouveau dossier."
                : hasApproved
                ? "Vous avez un crédit en cours. Une nouvelle demande ne peut être déposée qu'après remboursement complet."
                : "Votre demande est en cours de traitement. Attendez la décision avant d'en déposer une nouvelle."}
            </p>
            {canNewDemand && (
              <Link href="/dashboard/client/demande" className="mt-3 inline-flex px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition">
                Nouvelle demande →
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── GRAPHIQUE ÉCHÉANCES ───────────────────────────────────── */}
      {echeances && (
        <section className="mb-8 rounded-xl border border-slate-200 bg-white shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Plan de remboursement</h2>
            <p className="text-xs text-slate-500 mt-0.5">{echeances.type || "Crédit"} — approuvé</p>
          </div>
          <div className="px-6 py-5">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Left: stats */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Mensualité estimée", val: `${echeances.mensualite.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} TND` },
                    { label: "Restant dû", val: `${echeances.restantDu.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} TND` },
                    { label: "Échéances payées", val: `${echeances.paidMonths} / ${echeances.totalMonths}` },
                    { label: "Date de fin", val: echeances.endDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{s.label}</p>
                      <p className="mt-0.5 text-sm font-bold text-slate-800">{s.val}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Progression</span>
                    <span className="font-semibold text-primary-700">{echeances.progressPct}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-500 transition-all"
                      style={{ width: `${echeances.progressPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>{echeances.paidMonths} mois payés</span>
                    <span>{echeances.remainingMonths} mois restants</span>
                  </div>
                </div>
              </div>

              {/* Right: bar chart */}
              <div className="flex flex-col items-center justify-center gap-2">
                <EcheancesChart paid={echeances.paidMonths} remaining={echeances.remainingMonths} />
                <p className="text-[10px] text-slate-400 text-center">
                  Mensualités payées vs. restantes (en mois)
                </p>
              </div>
            </div>

            {/* Monthly timeline dots */}
            {echeances.totalMonths <= 60 && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-3">Calendrier des mensualités</p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: echeances.totalMonths }).map((_, i) => (
                    <div
                      key={i}
                      title={`Mois ${i + 1}`}
                      className={`w-5 h-5 rounded-full text-[9px] flex items-center justify-center font-medium ${
                        i < echeances.paidMonths
                          ? "bg-slate-300 text-slate-600"
                          : "bg-primary-500 text-white"
                      }`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-2 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-300 inline-block" /> Payée</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-primary-500 inline-block" /> À venir</span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── COMMENT ÇA MARCHE ─────────────────────────────────────── */}
      <section className="mb-8 rounded-xl border border-primary-100 bg-primary-50/40 p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-2">Comment ça marche</h2>
        <ul className="text-sm text-slate-700 space-y-1.5">
          <li className="flex items-center gap-2">
            <span className="text-primary-600 font-medium">1.</span>
            Choisissez un type de crédit et consultez les documents demandés ci-dessous.
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary-600 font-medium">2.</span>
            Déposez votre demande depuis <Link href="/dashboard/client/demande" className="font-medium text-primary-700 hover:underline">Ma demande</Link>.
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary-600 font-medium">3.</span>
            Envoyez vos justificatifs dans <Link href="/dashboard/client/documents" className="font-medium text-primary-700 hover:underline">Documents</Link>.
          </li>
        </ul>
      </section>

      {/* ── TYPES DE CRÉDIT ──────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Types de crédit disponibles</h2>
        {types.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 shadow-card text-center">
            <p className="text-slate-500 text-sm">Aucun type de crédit configuré pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl">
            {types.map((t) => {
              const isOpen = openId === t.id;
              const docs = DOCS_PAR_TYPE[t.nom] ?? ["Pièce d'identité", "Justificatif de domicile", "Justificatifs de revenus"];
              return (
                <div key={t.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition hover:border-slate-300">
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
                      <p className="text-slate-500 text-sm mt-0.5 truncate">{t.duree_max || "—"} · {t.montant_max || "—"}</p>
                    </div>
                    <span className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition ${isOpen ? "bg-primary-100 text-primary-700 rotate-180" : "bg-slate-100"}`}>
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
                            <li key={i} className="flex items-center gap-3 rounded-lg bg-white border border-slate-100 px-4 py-2.5 text-sm text-slate-700">
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

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Prêt à déposer votre dossier ?</h2>
            <p className="text-slate-600 text-sm mt-0.5">Créez une demande puis envoyez vos documents.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/client/demande" className="rounded-xl border-2 border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-medium text-primary-700 hover:bg-primary-100 transition">
              Ma demande
            </Link>
            <Link href="/dashboard/client/documents" className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition">
              Documents
            </Link>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
