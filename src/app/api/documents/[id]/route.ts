import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, res } = await requireAuth();
  if (res) return res;

  const { id } = await params;
  const body = await req.json();

  const { data: doc } = await supabase.from("documents").select("demande_id").eq("id", id).single();
  if (!doc) return NextResponse.json({ error: "Document non trouvé" }, { status: 404 });

  const { data: demande } = await supabase
    .from("demandes")
    .select("client_id, responsable_id")
    .eq("id", doc.demande_id)
    .single();
  if (!demande) return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
  const canEdit = session!.role === "admin" || demande.responsable_id === session!.id;
  if (!canEdit) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const update: Record<string, unknown> = {};
  if (body.statut != null) update.statut = body.statut;

  if (Object.keys(update).length === 0) return NextResponse.json({ error: "Rien à modifier" }, { status: 400 });

  const { data, error } = await supabase.from("documents").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
