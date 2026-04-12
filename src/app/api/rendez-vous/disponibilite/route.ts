import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

/**
 * GET /api/rendez-vous/disponibilite?agent_id=...&date=...
 * Returns { available: boolean, conflict?: { date_demandee, motif } }
 *
 * A slot is considered taken if the agent already has a confirmed/pending RDV
 * within a ±60-minute window of the requested time.
 */
export async function GET(req: Request) {
  const { res } = await requireAuth();
  if (res) return res;

  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agent_id");
  const dateStr = searchParams.get("date");

  if (!agentId || !dateStr) {
    return NextResponse.json({ error: "agent_id et date requis" }, { status: 400 });
  }

  const requested = new Date(dateStr);
  if (isNaN(requested.getTime())) {
    return NextResponse.json({ error: "Date invalide" }, { status: 400 });
  }

  const windowMs = 30 * 60 * 1000; // ±30 min → total conflict zone = 1 h
  const from = new Date(requested.getTime() - windowMs).toISOString();
  const to   = new Date(requested.getTime() + windowMs).toISOString();

  // Check confirmed or pending RDVs (not refused/past)
  const { data, error } = await supabase
    .from("rendez_vous")
    .select("id, date_demandee, date_proposee, motif, statut")
    .eq("agent_id", agentId)
    .not("statut", "in", '("reporte","passe")')
    .or(
      `date_demandee.gte.${from},date_demandee.lte.${to},date_proposee.gte.${from},date_proposee.lte.${to}`
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter in JS (Supabase `or` with range on two fields needs care)
  const conflicts = (data || []).filter((rdv) => {
    const d1 = rdv.date_demandee ? new Date(rdv.date_demandee).getTime() : null;
    const d2 = rdv.date_proposee ? new Date(rdv.date_proposee).getTime() : null;
    const reqT = requested.getTime();
    const hit = (t: number | null) => t !== null && Math.abs(t - reqT) < windowMs;
    return hit(d1) || hit(d2);
  });

  if (conflicts.length === 0) {
    return NextResponse.json({ available: true });
  }

  return NextResponse.json({
    available: false,
    conflict: {
      date: conflicts[0].date_demandee ?? conflicts[0].date_proposee,
      motif: conflicts[0].motif ?? "Rendez-vous existant",
    },
  });
}
