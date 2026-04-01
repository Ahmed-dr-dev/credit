"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { DEMANDE_STATUTS } from "@/lib/statuts";

type Demande = {
  id: string;
  montant: string;
  duree: string | null;
  statut: string;
  type_nom: string | null;
  created_at: string;
  type_credit?: { nom: string } | null;
};

const STATUT_STEPS = [
  { key: "en_attente",       label: "En attente",            icon: "⏳" },
  { key: "en_cours_etude",   label: "En cours d'étude",      icon: "🔍" },
  { key: "en_attente_infos", label: "Infos complémentaires", icon: "📎" },
  { key: "validee",          label: "Validée",               icon: "✅" },
];

const STATUT_COLOR: Record<string, string> = {
  validee:          "bg-green-100 text-green-800 border-green-200",
  refusee:          "bg-red-100 text-red-800 border-red-200",
  en_attente_infos: "bg-amber-100 text-amber-800 border-amber-200",
  en_cours_etude:   "bg-blue-100 text-blue-800 border-blue-200",
  en_attente:       "bg-slate-100 text-slate-700 border-slate-200",
};

function parseMontant(s: string) {
  return parseFloat(s.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
}
function monthsBetween(a: Date, b: Date) {
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth());
}

// ── Smooth SVG line chart ──────────────────────────────────────────────────
function LineChart({
  paid,
  remaining,
  mensualite,
}: {
  paid: number;
  remaining: number;
  mensualite: number;
}) {
  const total = paid + remaining;
  if (total === 0 || mensualite === 0) return null;

  const W = 420;
  const H = 140;
  const PAD = { top: 18, right: 16, bottom: 28, left: 52 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  // Build cumulative balance curve (remaining capital at each month)
  const points = Array.from({ length: total + 1 }, (_, i) => {
    const balance = mensualite * Math.max(total - i, 0);
    const x = PAD.left + (i / total) * iW;
    const y = PAD.top + iH - (balance / (mensualite * total)) * iH;
    return { x, y, i, balance };
  });

  // SVG smooth path via cubic bezier
  const pathD = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = points[i - 1];
    const cpx = (prev.x + pt.x) / 2;
    return `${acc} C ${cpx},${prev.y} ${cpx},${pt.y} ${pt.x},${pt.y}`;
  }, "");

  // Paid area fill
  const paidPts = points.slice(0, paid + 1);
  const areaD =
    paidPts.reduce((acc, pt, i) => {
      if (i === 0) return `M ${pt.x},${pt.y}`;
      const prev = paidPts[i - 1];
      const cpx = (prev.x + pt.x) / 2;
      return `${acc} C ${cpx},${prev.y} ${cpx},${pt.y} ${pt.x},${pt.y}`;
    }, "") +
    ` L ${paidPts[paidPts.length - 1].x},${PAD.top + iH} L ${PAD.left},${PAD.top + iH} Z`;

  const todayPt = points[paid];
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    val: Math.round(mensualite * total * (1 - f)).toLocaleString("fr-FR"),
    y: PAD.top + iH * f,
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
      <defs>
        <linearGradient id="paidGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16a34a" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#16a34a" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#16a34a" />
          <stop offset={`${(paid / total) * 100}%`} stopColor="#16a34a" />
          <stop offset={`${(paid / total) * 100}%`} stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yLabels.map((l) => (
        <g key={l.y}>
          <line x1={PAD.left} y1={l.y} x2={W - PAD.right} y2={l.y} stroke="#e2e8f0" strokeWidth="1" />
          <text x={PAD.left - 6} y={l.y + 4} textAnchor="end" fontSize={9} fill="#94a3b8">
            {l.val}
          </text>
        </g>
      ))}

      {/* Paid area fill */}
      <path d={areaD} fill="url(#paidGrad)" />

      {/* Full curve */}
      <path d={pathD} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" />

      {/* Today marker */}
      {todayPt && (
        <>
          <line
            x1={todayPt.x} y1={PAD.top}
            x2={todayPt.x} y2={PAD.top + iH}
            stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 3"
          />
          <circle cx={todayPt.x} cy={todayPt.y} r={5} fill="#6366f1" stroke="white" strokeWidth="2" />
          <text x={todayPt.x + 6} y={todayPt.y - 6} fontSize={9} fill="#6366f1" fontWeight="600">
            Aujourd&apos;hui
          </text>
        </>
      )}

      {/* X-axis labels */}
      {[0, Math.floor(total / 4), Math.floor(total / 2), Math.floor((3 * total) / 4), total].map((m) => (
        <text key={m} x={PAD.left + (m / total) * iW} y={H - 6} textAnchor="middle" fontSize={9} fill="#94a3b8">
          M{m}
        </text>
      ))}

      {/* Axis */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + iH} stroke="#cbd5e1" strokeWidth="1" />
      <line x1={PAD.left} y1={PAD.top + iH} x2={W - PAD.right} y2={PAD.top + iH} stroke="#cbd5e1" strokeWidth="1" />
    </svg>
  );
}

// ── Donut gauge ────────────────────────────────────────────────────────────
function Donut({ pct, color, label }: { pct: number; color: string; label: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={90} height={90} viewBox="0 0 90 90">
        <circle cx={45} cy={45} r={r} fill="none" stroke="#f1f5f9" strokeWidth={10} />
        <circle
          cx={45} cy={45} r={r} fill="none"
          stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 45 45)"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
        <text x={45} y={49} textAnchor="middle" fontSize={14} fontWeight="700" fill="#1e293b">
          {pct}%
        </text>
      </svg>
      <p className="text-xs text-slate-500 text-center leading-tight">{label}</p>
    </div>
  );
}

export default function SuiviDemande() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [docsCount, setDocsCount] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string>("");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "client")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role !== "client") return;
    fetch("/api/demandes", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then(async (list: Demande[]) => {
        setDemandes(list);
        if (list[0]?.id) setSelected(list[0].id);
        const counts: Record<string, number> = {};
        await Promise.all(
          list.map((d) =>
            fetch(`/api/documents?demandeId=${d.id}`, { credentials: "include" })
              .then((r) => (r.ok ? r.json() : []))
              .then((docs: unknown[]) => { counts[d.id] = docs.length; })
              .catch(() => { counts[d.id] = 0; })
          )
        );
        setDocsCount(counts);
      })
      .finally(() => setFetching(false));
  }, [role]);

  if (!isAuthenticated || role !== "client") return null;

  const demande = demandes.find((d) => d.id === selected) ?? demandes[0] ?? null;
  const stepIndex = demande
    ? demande.statut === "refusee" ? -1 : STATUT_STEPS.findIndex((s) => s.key === demande.statut)
    : -2;
  const docs = demande ? (docsCount[demande.id] ?? 0) : 0;
  const rdvUrl = demande
    ? `/dashboard/client/rendez-vous?demande=${demande.id}&motif=Discussion%20statut%20dossier%20cr%C3%A9dit&fromDocs=1`
    : "/dashboard/client/rendez-vous";

  // ── Repayment calculations (only when validée + duree) ──
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const plan = useMemo(() => {
    if (!demande || demande.statut !== "validee" || !demande.duree) return null;
    const endDate = new Date(demande.duree);
    const startDate = new Date(demande.created_at);
    const now = new Date();
    if (isNaN(endDate.getTime())) return null;
    const total = monthsBetween(startDate, endDate);
    if (total === 0) return null;
    const paid = Math.min(monthsBetween(startDate, now), total);
    const remaining = total - paid;
    const montant = parseMontant(demande.montant);
    const mensualite = montant / total;
    const restant = mensualite * remaining;
    const pct = Math.round((paid / total) * 100);
    return { total, paid, remaining, mensualite, restant, montant, pct, endDate };
  }, [demande]);

  return (
    <DashboardLayout role="client" title="Suivi demande">
      <div className="max-w-3xl">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/dashboard/client/demande" className="hover:text-primary-600 transition">Ma demande</Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Suivi</span>
        </div>

        {fetching ? (
          <p className="text-slate-500 text-sm py-12 text-center">Chargement…</p>
        ) : demandes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
            <p className="text-2xl mb-3">📭</p>
            <p className="font-semibold text-slate-700">Aucune demande trouvée</p>
            <p className="text-sm text-slate-500 mt-1 mb-5">Déposez votre première demande pour voir le suivi ici.</p>
            <Link href="/dashboard/client/demande/nouvelle" className="inline-flex px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition">
              Déposer une demande →
            </Link>
          </div>
        ) : (
          <>
            {demandes.length > 1 && (
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Dossier</label>
                <select value={selected} onChange={(e) => setSelected(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 outline-none">
                  {demandes.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.type_nom || "—"} · {d.montant} — {DEMANDE_STATUTS[d.statut] ?? d.statut}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {demande && (
              <div className="space-y-5">

                {/* ── Header ── */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xl font-bold text-slate-800">
                        {demande.type_nom || demande.type_credit?.nom || "Crédit"}
                      </p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Montant : <span className="font-bold text-slate-800">{demande.montant} TND</span>
                      </p>
                      {demande.duree && (
                        <p className="text-sm text-slate-500">
                          Date de fin :{" "}
                          <span className="font-semibold text-slate-700">
                            {new Date(demande.duree).toLocaleDateString("fr-FR", { dateStyle: "long" })}
                          </span>
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        Déposé le {new Date(demande.created_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUT_COLOR[demande.statut] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                      {DEMANDE_STATUTS[demande.statut] ?? demande.statut}
                    </span>
                  </div>
                </div>

                {/* ── Timeline ── */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card">
                  <h3 className="text-sm font-semibold text-slate-700 mb-5">Progression du dossier</h3>
                  {demande.statut === "refusee" ? (
                    <div className="rounded-lg bg-red-50 border border-red-100 p-4 text-sm text-red-800">
                      <p className="font-semibold mb-1">Demande refusée</p>
                      <p>Votre dossier n&apos;a pas été retenu. Contactez votre conseiller pour connaître les motifs.</p>
                      <Link href={rdvUrl} className="mt-3 inline-flex px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition">
                        Prendre rendez-vous →
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {STATUT_STEPS.map((step, i) => {
                        const done = i < stepIndex;
                        const active = i === stepIndex;
                        return (
                          <div key={step.key} className={`flex items-start gap-4 p-3 rounded-xl transition ${
                            active ? "bg-primary-50 border border-primary-100"
                            : done ? "opacity-75" : "opacity-35"
                          }`}>
                            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold border-2 ${
                              active ? "border-primary-600 bg-primary-600 text-white"
                              : done ? "border-primary-300 bg-primary-100 text-primary-700"
                              : "border-slate-200 bg-white text-slate-400"
                            }`}>
                              {done ? "✓" : step.icon}
                            </div>
                            <div className="flex-1">
                              <p className={`text-sm font-semibold ${active ? "text-primary-800" : done ? "text-primary-700" : "text-slate-400"}`}>
                                {step.label}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {active ? "En cours" : done ? "Complété" : "En attente"}
                              </p>
                            </div>
                            {active && <span className="text-[10px] font-semibold text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full self-start">Étape actuelle</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Repayment visuals (only when validated) ── */}
                {plan && (
                  <>
                    {/* KPI row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Mensualité", val: `${plan.mensualite.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} TND`, icon: "💳", color: "text-primary-700" },
                        { label: "Restant dû", val: `${plan.restant.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} TND`, icon: "🏦", color: "text-blue-700" },
                        { label: "Échéances payées", val: `${plan.paid} / ${plan.total}`, icon: "✅", color: "text-green-700" },
                        { label: "Date de fin", val: plan.endDate.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }), icon: "📅", color: "text-slate-700" },
                      ].map((k) => (
                        <div key={k.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-card">
                          <p className="text-lg">{k.icon}</p>
                          <p className={`text-base font-bold mt-1 ${k.color}`}>{k.val}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">{k.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Line chart card */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-slate-700">Courbe de remboursement</h3>
                        <div className="flex gap-3 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded bg-green-500 inline-block" /> Payé</span>
                          <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded bg-blue-400 inline-block" /> Restant</span>
                          <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded border-t-2 border-dashed border-indigo-400 inline-block" /> Aujourd&apos;hui</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">Capital restant dû mois par mois (TND)</p>
                      <LineChart paid={plan.paid} remaining={plan.remaining} mensualite={plan.mensualite} />
                    </div>

                    {/* Progress bar + donuts */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card">
                      <h3 className="text-sm font-semibold text-slate-700 mb-4">Avancement du remboursement</h3>

                      {/* Progress bar */}
                      <div className="mb-5">
                        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                          <span>{plan.paid} mois remboursés</span>
                          <span className="font-semibold text-primary-700">{plan.pct}%</span>
                        </div>
                        <div className="h-4 rounded-full bg-slate-100 overflow-hidden relative">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-green-400 to-primary-500 transition-all duration-700"
                            style={{ width: `${plan.pct}%` }}
                          />
                          {plan.pct > 10 && (
                            <span className="absolute inset-0 flex items-center pl-3 text-[10px] font-bold text-white">
                              {plan.pct}% remboursé
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                          <span>Début</span>
                          <span>{plan.remaining} mois restants</span>
                          <span>Fin {plan.endDate.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}</span>
                        </div>
                      </div>

                      {/* Donuts */}
                      <div className="flex justify-around">
                        <Donut pct={plan.pct} color="#22c55e" label="Capital remboursé" />
                        <Donut pct={100 - plan.pct} color="#3b82f6" label="Capital restant" />
                        <Donut
                          pct={plan.total > 0 ? Math.round(((plan.montant - plan.restant) / plan.montant) * 100) : 0}
                          color="#a855f7"
                          label="Montant versé"
                        />
                      </div>
                    </div>

                    {/* Monthly dots calendar */}
                    {plan.total <= 60 && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">Calendrier des mensualités</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {Array.from({ length: plan.total }).map((_, i) => (
                            <div
                              key={i}
                              title={`Mois ${i + 1} — ${plan.mensualite.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} TND`}
                              className={`w-7 h-7 rounded-lg text-[9px] flex items-center justify-center font-semibold transition cursor-default ${
                                i < plan.paid
                                  ? "bg-green-100 text-green-700 border border-green-200"
                                  : i === plan.paid
                                  ? "bg-indigo-500 text-white ring-2 ring-indigo-300"
                                  : "bg-blue-50 text-blue-400 border border-blue-100"
                              }`}
                            >
                              {i + 1}
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-4 mt-3 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-200 inline-block" /> Payée</span>
                          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-500 inline-block" /> En cours</span>
                          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-50 border border-blue-100 inline-block" /> À venir</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── Documents ── */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700">Documents justificatifs</h3>
                    <Link href="/dashboard/client/documents" className="text-xs text-primary-600 hover:underline font-medium">Gérer →</Link>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold ${docs > 0 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {docs}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {docs > 0 ? `${docs} document${docs > 1 ? "s" : ""} déposé${docs > 1 ? "s" : ""}` : "Aucun document déposé"}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {docs === 0 ? "Déposez vos justificatifs pour avancer le traitement." : "Documents reçus par le conseiller."}
                      </p>
                    </div>
                  </div>
                  {docs === 0 && (
                    <Link href="/dashboard/client/documents" className="mt-3 inline-flex w-full items-center justify-center px-4 py-2.5 rounded-xl border-2 border-dashed border-primary-200 text-primary-700 text-sm font-medium hover:bg-primary-50 transition">
                      + Déposer des documents
                    </Link>
                  )}
                </div>

                {/* ── RDV CTA ── */}
                {docs > 0 && demande.statut !== "refusee" && demande.statut !== "validee" && (
                  <div className="rounded-xl bg-primary-50 border border-primary-100 p-4">
                    <p className="text-sm font-semibold text-primary-800 mb-1">Documents déposés ✓</p>
                    <p className="text-sm text-primary-700 mb-3">Réservez un rendez-vous avec votre conseiller pour discuter de l&apos;avancement.</p>
                    <Link href={rdvUrl} className="inline-flex px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition">
                      Réserver un rendez-vous →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
