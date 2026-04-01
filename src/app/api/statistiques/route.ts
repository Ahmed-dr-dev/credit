import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireRole } from "@/lib/api-auth";

export async function GET(req: Request) {
  const { res } = await requireRole(["admin"]);
  if (res) return res;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");   // ISO date string
  const to   = searchParams.get("to");     // ISO date string

  // ── Demandes ─────────────────────────────────────────────────────────────
  let dq = supabase
    .from("demandes")
    .select("id, montant, statut, type_nom, responsable_id, created_at");
  if (from) dq = dq.gte("created_at", from);
  if (to)   dq = dq.lte("created_at", to + "T23:59:59");

  const { data: demandes, error: eD } = await dq;
  if (eD) return NextResponse.json({ error: eD.message }, { status: 500 });

  // ── Profiles ─────────────────────────────────────────────────────────────
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, role, compte_bancaire_actif, created_at");

  // ── Comptes bancaires ────────────────────────────────────────────────────
  let cbq = supabase.from("comptes_bancaires").select("id, created_at");
  if (from) cbq = cbq.gte("created_at", from);
  if (to)   cbq = cbq.lte("created_at", to + "T23:59:59");
  const { data: comptes } = await cbq;

  // ── Rendez-vous ──────────────────────────────────────────────────────────
  let rq = supabase.from("rendez_vous").select("id, statut, created_at, agent_id");
  if (from) rq = rq.gte("created_at", from);
  if (to)   rq = rq.lte("created_at", to + "T23:59:59");
  const { data: rdvs } = await rq;

  const d = demandes || [];
  const p = profiles || [];
  const cb = comptes || [];
  const r = rdvs || [];

  // ── Aggregations ─────────────────────────────────────────────────────────
  const total        = d.length;
  const enAttente    = d.filter((x) => x.statut === "en_attente").length;
  const enCours      = d.filter((x) => ["en_cours_etude", "en_attente_infos"].includes(x.statut)).length;
  const validees     = d.filter((x) => x.statut === "validee").length;
  const refusees     = d.filter((x) => x.statut === "refusee").length;
  const tauxAccept   = validees + refusees > 0 ? Math.round((validees / (validees + refusees)) * 100) : 0;

  const parseMontant = (m: string | null): number => parseFloat((m ?? "0").replace(/[^\d.]/g, "")) || 0;
  const montantTotal     = d.reduce((s, x) => s + parseMontant(x.montant), 0);
  const montantValide    = d.filter((x) => x.statut === "validee").reduce((s, x) => s + parseMontant(x.montant), 0);
  const montantEnCours   = d.filter((x) => ["en_cours_etude", "en_attente_infos"].includes(x.statut)).reduce((s, x) => s + parseMontant(x.montant), 0);

  const nbClients  = p.filter((x) => x.role === "client").length;
  const nbAgents   = p.filter((x) => x.role === "agent").length;
  const nbActifs   = p.filter((x) => x.role === "client" && x.compte_bancaire_actif).length;
  const nbComptes  = cb.length;
  const nbRdv      = r.length;
  const rdvConfirmes = r.filter((x) => x.statut === "confirme").length;

  // ── Demandes par mois (last 12 months) ───────────────────────────────────
  const byMonth: Record<string, { total: number; validees: number; refusees: number }> = {};
  d.forEach((x) => {
    const key = x.created_at?.slice(0, 7) ?? "?"; // YYYY-MM
    if (!byMonth[key]) byMonth[key] = { total: 0, validees: 0, refusees: 0 };
    byMonth[key].total++;
    if (x.statut === "validee") byMonth[key].validees++;
    if (x.statut === "refusee") byMonth[key].refusees++;
  });

  // ── Par type de crédit ────────────────────────────────────────────────────
  const byType: Record<string, number> = {};
  d.forEach((x) => {
    const t = x.type_nom ?? "Non précisé";
    byType[t] = (byType[t] ?? 0) + 1;
  });

  // ── Par agent (responsable) ───────────────────────────────────────────────
  const byAgent: Record<string, { total: number; validees: number }> = {};
  d.forEach((x) => {
    if (!x.responsable_id) return;
    if (!byAgent[x.responsable_id]) byAgent[x.responsable_id] = { total: 0, validees: 0 };
    byAgent[x.responsable_id].total++;
    if (x.statut === "validee") byAgent[x.responsable_id].validees++;
  });

  // Join agent names
  const agentProfiles = p.filter((x) => x.role === "agent");
  const agentRows = Object.entries(byAgent).map(([id, s]) => {
    const prof = agentProfiles.find((a) => a.id === id) as { id: string; nom?: string; prenom?: string } | undefined;
    return { id, nom: prof ? `${(prof as {prenom?:string}).prenom ?? ""} ${(prof as {nom?:string}).nom ?? ""}`.trim() : id.slice(0, 8), ...s };
  }).sort((a, b) => b.validees - a.validees);

  return NextResponse.json({
    kpis: { total, enAttente, enCours, validees, refusees, tauxAccept, montantTotal, montantValide, montantEnCours, nbClients, nbAgents, nbActifs, nbComptes, nbRdv, rdvConfirmes },
    byMonth,
    byType,
    agentRows,
  });
}
