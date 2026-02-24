import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, res } = await requireAuth();
  if (res) return res;

  const { id } = await params;
  const body = await req.json();

  const { data: rdv } = await supabase.from("rendez_vous").select("agent_id").eq("id", id).single();
  if (!rdv) return NextResponse.json({ error: "RDV non trouvé" }, { status: 404 });
  if (session!.role !== "admin" && rdv.agent_id !== session!.id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const update: Record<string, unknown> = {};
  if (body.statut != null) update.statut = body.statut;
  if (body.date_proposee !== undefined) update.date_proposee = body.date_proposee ? new Date(body.date_proposee).toISOString() : null;

  if (Object.keys(update).length === 0) return NextResponse.json({ error: "Rien à modifier" }, { status: 400 });

  const { data, error } = await supabase.from("rendez_vous").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
