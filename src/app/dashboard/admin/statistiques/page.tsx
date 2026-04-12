"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
 
// ── Types ──────────────────────────────────────────────────────────────────

// ── Paramètres types ──────────────────────────────────────────────────────

type Param = {
  cle: string;
  valeur: string;
  label: string;
  unite: string;
  groupe: string;
  description?: string;
  updated_at?: string | null;
};

type KPIs = {
  total: number; enAttente: number; enCours: number; validees: number; refusees: number;
  tauxAccept: number; montantTotal: number; montantValide: number; montantEnCours: number;
  nbClients: number; nbAgents: number; nbActifs: number; nbComptes: number;
  nbRdv: number; rdvConfirmes: number;
};

type ByMonth = Record<string, { total: number; validees: number; refusees: number }>;
type ByType  = Record<string, number>;
type AgentRow = { id: string; nom: string; total: number; validees: number };

type Stats = { kpis: KPIs; byMonth: ByMonth; byType: ByType; agentRows: AgentRow[] };

// ── Presets ────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const startOf = (unit: "month" | "year") => {
  const d = new Date();
  if (unit === "month") return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  return new Date(d.getFullYear(), 0, 1).toISOString().slice(0, 10);
};

const PRESETS = [
  { label: "7 derniers jours", from: () => daysAgo(7), to: today },
  { label: "30 derniers jours", from: () => daysAgo(30), to: today },
  { label: "Ce mois", from: () => startOf("month"), to: today },
  { label: "Cette année", from: () => startOf("year"), to: today },
  { label: "Tout", from: () => "", to: () => "" },
];

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + " M DT"
    : n >= 1_000
    ? (n / 1_000).toFixed(1) + " k DT"
    : n + " DT";

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

const MONTH_LABELS = ["Jan","Fév","Mar","Avr","Mai","Jui","Jul","Aoû","Sep","Oct","Nov","Déc"];

// ── Export helpers ─────────────────────────────────────────────────────────

function toCSV(rows: (string | number)[][], headers: string[]): string {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Sub-components ─────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon, color,
}: { label: string; value: string; sub?: string; icon: string; color: string }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 shadow-card flex gap-4 items-start`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide truncate">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5 leading-none">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function DonutChart({ slices }: { slices: { value: number; color: string; label: string }[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  let cumulative = 0;
  const R = 36; const CX = 44; const CY = 44; const circumference = 2 * Math.PI * R;
  return (
    <svg width={88} height={88} viewBox="0 0 88 88">
      {slices.map((s, i) => {
        const dash = (s.value / total) * circumference;
        const gap  = circumference - dash;
        const rot  = (cumulative / total) * 360 - 90;
        cumulative += s.value;
        return (
          <circle key={i} cx={CX} cy={CY} r={R}
            fill="none" strokeWidth={14}
            stroke={s.color}
            strokeDasharray={`${dash} ${gap}`}
            strokeLinecap="butt"
            transform={`rotate(${rot} ${CX} ${CY})`}
          />
        );
      })}
      <circle cx={CX} cy={CY} r={29} fill="white" />
    </svg>
  );
}

function LineChart({ byMonth }: { byMonth: ByMonth }) {
  const now = new Date();
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const totals   = months.map((m) => byMonth[m]?.total ?? 0);
  const validees = months.map((m) => byMonth[m]?.validees ?? 0);
  const maxVal   = Math.max(...totals, 1);

  const W = 560; const H = 140; const PAD_L = 28; const PAD_B = 28; const PAD_T = 12;
  const chartW = W - PAD_L - 4; const chartH = H - PAD_B - PAD_T;
  const xStep = chartW / (months.length - 1);

  const pts = (vals: number[]) =>
    vals.map((v, i) => `${PAD_L + i * xStep},${PAD_T + chartH - (v / maxVal) * chartH}`).join(" ");

  const polyTotal   = pts(totals);
  const polyValidee = pts(validees);

  const areaPath = (vals: number[]) => {
    const p = vals.map((v, i) => `${PAD_L + i * xStep},${PAD_T + chartH - (v / maxVal) * chartH}`);
    return `M${p[0]} L${p.join(" L")} L${PAD_L + (months.length - 1) * xStep},${PAD_T + chartH} L${PAD_L},${PAD_T + chartH} Z`;
  };

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[360px]" style={{ height: 160 }}>
        <defs>
          <linearGradient id="gt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Y gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={PAD_L} x2={W - 4} y1={PAD_T + chartH * (1 - f)} y2={PAD_T + chartH * (1 - f)}
              stroke="#e2e8f0" strokeWidth={1} />
            <text x={PAD_L - 4} y={PAD_T + chartH * (1 - f) + 4} fontSize={9} fill="#94a3b8" textAnchor="end">
              {Math.round(maxVal * f)}
            </text>
          </g>
        ))}
        {/* Areas */}
        <path d={areaPath(totals)} fill="url(#gt)" />
        <path d={areaPath(validees)} fill="url(#gv)" />
        {/* Lines */}
        <polyline points={polyTotal} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinejoin="round" />
        <polyline points={polyValidee} fill="none" stroke="#10b981" strokeWidth={2} strokeLinejoin="round" />
        {/* X labels */}
        {months.map((m, i) => (
          <text key={m} x={PAD_L + i * xStep} y={H - 6} fontSize={9} fill="#94a3b8" textAnchor="middle">
            {MONTH_LABELS[parseInt(m.slice(5, 7)) - 1]}
          </text>
        ))}
        {/* Dots */}
        {totals.map((v, i) => (
          <circle key={i} cx={PAD_L + i * xStep} cy={PAD_T + chartH - (v / maxVal) * chartH}
            r={3} fill="#6366f1" />
        ))}
        {validees.map((v, i) => (
          <circle key={i} cx={PAD_L + i * xStep} cy={PAD_T + chartH - (v / maxVal) * chartH}
            r={3} fill="#10b981" />
        ))}
      </svg>
      <div className="flex gap-5 mt-1 justify-end pr-2">
        <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-0.5 bg-indigo-500 inline-block rounded" />Total demandes</span>
        <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-0.5 bg-emerald-500 inline-block rounded" />Validées</span>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AdminStatistiques() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [fetching, setFetching] = useState(false);
  const [activePreset, setActivePreset] = useState(4); // "Tout"
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [custom, setCustom] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // ── Paramètres state ───────────────────────────────────────────────────
  const [params, setParams]         = useState<Param[]>([]);
  const [paramEdits, setParamEdits] = useState<Record<string, string>>({});
  const [paramSaving, setParamSaving] = useState(false);
  const [paramMsg, setParamMsg]     = useState<{ ok: boolean; text: string } | null>(null);
  const [paramOpen, setParamOpen]   = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "admin")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  const load = useCallback(
    async (from: string, to: string) => {
      setFetching(true);
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to)   qs.set("to", to);
      const r = await fetch(`/api/statistiques?${qs}`, { credentials: "include" });
      if (r.ok) setStats(await r.json());
      setFetching(false);
    },
    []
  );

  useEffect(() => {
    if (role === "admin") load("", "");
  }, [role, load]);

  const applyPreset = (idx: number) => {
    setCustom(false);
    setActivePreset(idx);
    const from = PRESETS[idx].from();
    const to   = PRESETS[idx].to();
    setDateFrom(from);
    setDateTo(to);
    load(from, to);
  };

  const applyCustom = () => {
    setActivePreset(-1);
    load(dateFrom, dateTo);
  };

  // ── Export functions ─────────────────────────────────────────────────────

  const periodLabel = () => {
    if (dateFrom && dateTo) return `${dateFrom} au ${dateTo}`;
    if (activePreset >= 0) return PRESETS[activePreset].label;
    return "Toute la période";
  };

  const exportCSV = () => {
    if (!stats) return;
    const { kpis: k, byType, agentRows } = stats;
    const sections: string[] = [];

    // KPIs
    sections.push("INDICATEURS CLÉS");
    sections.push(toCSV([
      ["Total demandes", k.total],
      ["En attente", k.enAttente],
      ["En cours", k.enCours],
      ["Validées", k.validees],
      ["Refusées", k.refusees],
      ["Taux d'acceptation (%)", k.tauxAccept],
      ["Montant total demandé (DT)", k.montantTotal],
      ["Montant validé (DT)", k.montantValide],
      ["Clients inscrits", k.nbClients],
      ["Clients avec compte bancaire", k.nbActifs],
      ["Agents crédit", k.nbAgents],
      ["Comptes bancaires créés", k.nbComptes],
      ["Rendez-vous", k.nbRdv],
      ["Rendez-vous confirmés", k.rdvConfirmes],
    ], ["Indicateur", "Valeur"]));

    // By type
    sections.push("\nDEMANDES PAR TYPE DE CRÉDIT");
    sections.push(toCSV(Object.entries(byType).map(([t, n]) => [t, n]), ["Type", "Nombre"]));

    // Agent performance
    sections.push("\nPERFORMANCE AGENTS");
    sections.push(toCSV(
      agentRows.map((a) => [a.nom, a.total, a.validees, pct(a.validees, a.total)]),
      ["Agent", "Dossiers", "Validés", "Taux (%)"]
    ));

    // Monthly
    sections.push("\nÉVOLUTION MENSUELLE");
    const monthEntries = Object.entries(stats.byMonth).sort(([a], [b]) => a.localeCompare(b));
    sections.push(toCSV(
      monthEntries.map(([m, v]) => [m, v.total, v.validees, v.refusees]),
      ["Mois", "Total", "Validées", "Refusées"]
    ));

    const filename = `statistiques_bna_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSV(sections.join("\n"), filename);
    setExportOpen(false);
  };

  const exportPrint = () => {
    setExportOpen(false);
    setTimeout(() => window.print(), 200);
  };

  // ── Load parameters ─────────────────────────────────────────────────────
  useEffect(() => {
    if (role !== "admin") return;
    fetch("/api/parametres", { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((data: Param[]) => {
        setParams(data);
        const edits: Record<string, string> = {};
        data.forEach((p) => { edits[p.cle] = p.valeur; });
        setParamEdits(edits);
      });
  }, [role]);

  const saveParams = async () => {
    setParamSaving(true);
    setParamMsg(null);
    const body = Object.entries(paramEdits).map(([cle, valeur]) => ({ cle, valeur }));
    const r = await fetch("/api/parametres", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setParamSaving(false);
    if (r.ok) {
      const updated: Param[] = await r.json();
      setParams((prev) => {
        const map: Record<string, Param> = {};
        prev.forEach((p) => { map[p.cle] = p; });
        updated.forEach((p) => { map[p.cle] = p; });
        return Object.values(map);
      });
      setParamMsg({ ok: true, text: "Paramètres sauvegardés avec succès." });
    } else {
      setParamMsg({ ok: false, text: "Erreur lors de la sauvegarde." });
    }
    setTimeout(() => setParamMsg(null), 4000);
  };

  if (!isAuthenticated || role !== "admin") return null;

  const k = stats?.kpis;

  return (
    <DashboardLayout role="admin" title="Statistiques">

      {/* Print-only header */}
      <div className="hidden print:block mb-6 border-b border-slate-300 pb-4">
        <h1 className="text-2xl font-bold text-slate-800">Rapport statistiques — BNA Crédit</h1>
        <p className="text-sm text-slate-500 mt-1">Période : {periodLabel()} · Généré le {new Date().toLocaleDateString("fr-FR", { dateStyle: "long" })}</p>
      </div>

      {/* ── Date filter ─────────────────────────────────────────────── */}
      <div className="mb-7 bg-white rounded-xl border border-slate-200 p-4 shadow-card flex flex-wrap gap-3 items-end print:hidden">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p, i) => (
            <button key={p.label} onClick={() => applyPreset(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${
                activePreset === i && !custom
                  ? "bg-primary-600 text-white border-primary-600 shadow-soft"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}>
              {p.label}
            </button>
          ))}
          <button onClick={() => { setCustom(true); setActivePreset(-1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${
              custom ? "bg-primary-600 text-white border-primary-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}>
            Personnalisé
          </button>
        </div>

        {custom && (
          <div className="flex gap-2 items-end ml-auto">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Du</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Au</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none" />
            </div>
            <button onClick={applyCustom}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition">
              Appliquer
            </button>
          </div>
        )}

        {fetching && <span className="text-xs text-slate-400 animate-pulse">Chargement…</span>}

        {/* Export button */}
        {stats && (
          <div ref={exportRef} className="relative ml-auto">
            <button
              onClick={() => setExportOpen((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-soft"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
              Exporter
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 transition-transform ${exportOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {exportOpen && (
              <div className="absolute right-0 top-11 w-52 bg-white rounded-xl border border-slate-200 shadow-2xl z-50 overflow-hidden">
                <button
                  onClick={exportCSV}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition text-left"
                >
                  <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">CSV</span>
                  <div>
                    <p className="font-medium">Exporter CSV</p>
                    <p className="text-xs text-slate-400">Excel, Sheets…</p>
                  </div>
                </button>
                <div className="border-t border-slate-100" />
                <button
                  onClick={exportPrint}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition text-left"
                >
                  <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-medium">Imprimer / PDF</p>
                    <p className="text-xs text-slate-400">Via la boîte de dialogue</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {!k ? (
        <div className="flex items-center justify-center h-40 text-slate-400 text-sm animate-pulse">Chargement des statistiques…</div>
      ) : (
        <>
          {/* ── KPIs row 1 : demandes ───────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
            <KpiCard icon="📋" color="bg-indigo-50" label="Total demandes" value={String(k.total)} sub={`${k.enAttente} en attente`} />
            <KpiCard icon="✅" color="bg-emerald-50" label="Validées" value={String(k.validees)} sub={`Taux : ${k.tauxAccept} %`} />
            <KpiCard icon="❌" color="bg-red-50" label="Refusées" value={String(k.refusees)} sub={`${pct(k.refusees, k.total)} % du total`} />
            <KpiCard icon="⏳" color="bg-amber-50" label="En cours d'étude" value={String(k.enCours)} sub={`${pct(k.enCours, k.total)} % du total`} />
          </div>

          {/* ── KPIs row 2 : montants ───────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
            <KpiCard icon="💰" color="bg-sky-50" label="Montant total demandé" value={fmt(k.montantTotal)} sub="Tous statuts" />
            <KpiCard icon="🏦" color="bg-emerald-50" label="Montant validé" value={fmt(k.montantValide)} sub={`${pct(k.montantValide, k.montantTotal)} % du total`} />
            <KpiCard icon="🔍" color="bg-amber-50" label="Montant en étude" value={fmt(k.montantEnCours)} sub="En cours d'instruction" />
            <KpiCard icon="📈" color="bg-indigo-50" label="Taux d'acceptation" value={`${k.tauxAccept} %`} sub={`${k.validees} / ${k.validees + k.refusees} traitées`} />
          </div>

          {/* ── KPIs row 3 : comptes & utilisateurs ─────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <KpiCard icon="👥" color="bg-slate-100" label="Clients inscrits" value={String(k.nbClients)} sub={`${k.nbActifs} avec compte bancaire`} />
            <KpiCard icon="🧑‍💼" color="bg-slate-100" label="Agents crédit" value={String(k.nbAgents)} sub="Responsables de dossiers" />
            <KpiCard icon="🏧" color="bg-sky-50" label="Comptes bancaires" value={String(k.nbComptes)} sub="Créés sur la période" />
            <KpiCard icon="📅" color="bg-purple-50" label="Rendez-vous" value={String(k.nbRdv)} sub={`${k.rdvConfirmes} confirmés`} />
          </div>

          {/* ── Charts row ──────────────────────────────────────────── */}
          <div className="grid gap-6 lg:grid-cols-3 mb-6">

            {/* Line chart */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-card">
              <h3 className="text-base font-semibold text-slate-800 mb-4">Évolution mensuelle des demandes (12 mois)</h3>
              <LineChart byMonth={stats!.byMonth} />
            </div>

            {/* Donut + legend */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
              <h3 className="text-base font-semibold text-slate-800 mb-4">Répartition par statut</h3>
              <div className="flex items-center gap-6">
                <DonutChart slices={[
                  { value: k.enAttente, color: "#94a3b8", label: "Attente" },
                  { value: k.enCours,   color: "#f59e0b", label: "En cours" },
                  { value: k.validees,  color: "#10b981", label: "Validées" },
                  { value: k.refusees,  color: "#ef4444", label: "Refusées" },
                ]} />
                <div className="space-y-2 text-sm min-w-0">
                  {[
                    { label: "Attente",   val: k.enAttente, color: "bg-slate-400" },
                    { label: "En cours",  val: k.enCours,   color: "bg-amber-400" },
                    { label: "Validées",  val: k.validees,  color: "bg-emerald-500" },
                    { label: "Refusées",  val: k.refusees,  color: "bg-red-500" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.color}`} />
                      <span className="text-slate-600 truncate">{s.label}</span>
                      <span className="ml-auto font-semibold text-slate-800">{s.val}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-100 pt-2 flex items-center gap-2">
                    <span className="text-slate-400 text-xs">Total</span>
                    <span className="ml-auto font-bold text-slate-800">{k.total}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Type de crédit + Agent leaderboard ──────────────────── */}
          <div className="grid gap-6 lg:grid-cols-2">

            {/* Bar chart by type */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
              <h3 className="text-base font-semibold text-slate-800 mb-5">Demandes par type de crédit</h3>
              {Object.keys(stats!.byType).length === 0 ? (
                <p className="text-slate-400 text-sm">Aucune donnée</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(stats!.byType)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => {
                      const pctVal = pct(count, k.total);
                      return (
                        <div key={type}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-700 truncate max-w-[180px]">{type}</span>
                            <span className="font-semibold text-slate-800">{count} <span className="text-slate-400 font-normal">({pctVal}%)</span></span>
                          </div>
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                              style={{ width: `${pctVal}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Agent leaderboard */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
              <h3 className="text-base font-semibold text-slate-800 mb-5">Performance agents</h3>
              {stats!.agentRows.length === 0 ? (
                <p className="text-slate-400 text-sm">Aucun dossier assigné</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100">
                      <th className="pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">Agent</th>
                      <th className="pb-2 font-medium text-right">Dossiers</th>
                      <th className="pb-2 font-medium text-right">Validés</th>
                      <th className="pb-2 font-medium text-right">Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats!.agentRows.map((a, i) => (
                      <tr key={a.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-2.5 pr-2 text-slate-400 font-mono text-xs">{i + 1}</td>
                        <td className="py-2.5 pr-4 font-medium text-slate-700 truncate max-w-[140px]">{a.nom || "—"}</td>
                        <td className="py-2.5 text-right text-slate-600">{a.total}</td>
                        <td className="py-2.5 text-right text-emerald-600 font-semibold">{a.validees}</td>
                        <td className="py-2.5 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            pct(a.validees, a.total) >= 70 ? "bg-emerald-100 text-emerald-700"
                            : pct(a.validees, a.total) >= 40 ? "bg-amber-100 text-amber-700"
                            : "bg-red-50 text-red-600"
                          }`}>
                            {pct(a.validees, a.total)} %
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ── Conversion funnel ───────────────────────────────────── */}
          <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6 shadow-card">
            <h3 className="text-base font-semibold text-slate-800 mb-5">Entonnoir de traitement des demandes</h3>
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
              {[
                { label: "Soumises", val: k.total, color: "bg-indigo-500" },
                { label: "En cours", val: k.enCours, color: "bg-amber-400" },
                { label: "Validées", val: k.validees, color: "bg-emerald-500" },
              ].map((step, i) => {
                const widthPct = pct(step.val, k.total);
                return (
                  <div key={step.label} className="flex-1 text-center">
                    {i > 0 && (
                      <div className="hidden sm:flex items-center justify-center text-slate-300 text-xl mb-2">→</div>
                    )}
                    <div className="rounded-xl p-4 bg-slate-50 border border-slate-100">
                      <div className={`h-2.5 rounded-full mb-3 ${step.color}`} style={{ width: `${Math.max(widthPct, 4)}%` }} />
                      <p className="text-2xl font-bold text-slate-800">{step.val}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{step.label}</p>
                      <p className="text-xs font-semibold text-slate-400 mt-1">{widthPct} %</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ══ PARAMÈTRES SECTION ══════════════════════════════════════════ */}
      <div className="mt-10 print:hidden">
        {/* Collapsible header */}
        <button
          onClick={() => setParamOpen((v) => !v)}
          className="w-full flex items-center justify-between bg-white rounded-xl border border-slate-200 px-6 py-4 shadow-card hover:bg-slate-50 transition group"
        >
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </span>
            <div className="text-left">
              <p className="text-base font-semibold text-slate-800">Paramètres des crédits</p>
              <p className="text-xs text-slate-500 mt-0.5">Taux d&apos;intérêt, durées maximales, montants, frais</p>
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 text-slate-400 transition-transform ${paramOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {paramOpen && (
          <div className="mt-3 bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            {/* Info banner */}
            <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3 flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-indigo-700">Ces paramètres sont utilisés lors du calcul des échéances et de la vérification d&apos;éligibilité des demandes de crédit.</p>
            </div>

            <div className="p-6">
              {params.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">Chargement des paramètres…</p>
              ) : (
                (() => {
                  const GROUPES: { key: string; label: string; icon: string; color: string }[] = [
                    { key: "taux",    label: "Taux d'intérêt annuels",   icon: "📈", color: "bg-indigo-50 border-indigo-100" },
                    { key: "duree",   label: "Durées maximales",         icon: "🗓️",  color: "bg-amber-50 border-amber-100" },
                    { key: "montant", label: "Montants maximaux",        icon: "💰", color: "bg-emerald-50 border-emerald-100" },
                    { key: "frais",   label: "Frais & conditions",       icon: "📋", color: "bg-rose-50 border-rose-100" },
                  ];
                  return (
                    <div className="space-y-7">
                      {GROUPES.map((g) => {
                        const items = params.filter((p) => p.groupe === g.key);
                        if (items.length === 0) return null;
                        return (
                          <div key={g.key}>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-base">{g.icon}</span>
                              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{g.label}</h4>
                            </div>
                            <div className={`rounded-xl border p-4 ${g.color} grid gap-4 sm:grid-cols-2 lg:grid-cols-3`}>
                              {items.map((p) => (
                                <div key={p.cle} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                                  <label className="block text-xs font-medium text-slate-700 mb-1">{p.label}</label>
                                  {p.description && (
                                    <p className="text-[11px] text-slate-400 mb-2 leading-tight">{p.description}</p>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={paramEdits[p.cle] ?? p.valeur}
                                      onChange={(e) =>
                                        setParamEdits((prev) => ({ ...prev, [p.cle]: e.target.value }))
                                      }
                                      className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none bg-slate-50 font-mono"
                                    />
                                    <span className="text-xs text-slate-500 font-medium shrink-0 bg-slate-100 px-2 py-1.5 rounded-md">{p.unite}</span>
                                  </div>
                                  {p.updated_at && (
                                    <p className="text-[10px] text-slate-300 mt-1.5">
                                      Modifié le {new Date(p.updated_at).toLocaleDateString("fr-FR")}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {/* Save bar */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-5 gap-4">
                        {paramMsg ? (
                          <p className={`text-sm font-medium ${paramMsg.ok ? "text-emerald-600" : "text-red-600"}`}>
                            {paramMsg.ok ? "✓ " : "✗ "}{paramMsg.text}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400">Les modifications ne sont appliquées qu&apos;après sauvegarde.</p>
                        )}
                        <button
                          onClick={saveParams}
                          disabled={paramSaving}
                          className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 shadow-soft flex items-center gap-2 shrink-0"
                        >
                          {paramSaving ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                              Sauvegarde…
                            </>
                          ) : (
                            "Sauvegarder les paramètres"
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
