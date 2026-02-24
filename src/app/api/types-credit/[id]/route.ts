import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireRole } from "@/lib/api-auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { res } = await requireRole(["admin"]);
  if (res) return res;

  const { id } = await params;
  const body = await req.json();
  const update: Record<string, unknown> = {};
  if (body.nom != null) update.nom = String(body.nom).trim();
  if (body.description !== undefined) update.description = body.description?.trim() || null;
  if (body.duree_max !== undefined) update.duree_max = body.duree_max?.trim() || null;
  if (body.montant_max !== undefined) update.montant_max = body.montant_max?.trim() || null;

  if (Object.keys(update).length === 0) return NextResponse.json({ error: "Rien à modifier" }, { status: 400 });

  const { data, error } = await supabase.from("types_credit").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { res } = await requireRole(["admin"]);
  if (res) return res;

  const { id } = await params;
  const { error } = await supabase.from("types_credit").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
