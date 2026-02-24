import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth, requireRole } from "@/lib/api-auth";

export async function GET(req: Request) {
  const { session, res } = await requireAuth();
  if (res) return res;

  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut");

  if (session!.role === "client") {
    let q = supabase
      .from("rendez_vous")
      .select(`
        *,
        agent:profiles!agent_id(prenom, nom, email)
      `)
      .eq("client_id", session!.id)
      .order("date_demandee", { ascending: false });
    if (statut) q = q.eq("statut", statut);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  }

  if (session!.role === "agent") {
    let q = supabase
      .from("rendez_vous")
      .select(`
        *,
        client:profiles!client_id(prenom, nom, email)
      `)
      .eq("agent_id", session!.id)
      .order("date_demandee", { ascending: false });
    if (statut) q = q.eq("statut", statut);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  }

  return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
}

export async function POST(req: Request) {
  const { session, res } = await requireRole(["client"]);
  if (res) return res;

  const body = await req.json();
  const { agent_id, demande_id, date_demandee, motif } = body;
  if (!agent_id || !motif?.trim()) {
    return NextResponse.json({ error: "Agent et motif requis" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("rendez_vous")
    .insert({
      client_id: session!.id,
      agent_id,
      demande_id: demande_id || null,
      date_demandee: date_demandee ? new Date(date_demandee).toISOString() : null,
      motif: motif.trim(),
    })
    .select(`
      *,
      agent:profiles!agent_id(prenom, nom)
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
