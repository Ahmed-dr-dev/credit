import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireRole } from "@/lib/api-auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { res } = await requireRole(["admin"]);
  if (res) return res;

  const body = await req.json();
  const { keywords, response, actif } = body;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (keywords !== undefined) update.keywords = keywords.trim();
  if (response !== undefined) update.response = response.trim();
  if (actif !== undefined) update.actif = actif;

  const { data, error } = await supabase
    .from("assistant_qa")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { res } = await requireRole(["admin"]);
  if (res) return res;

  const { error } = await supabase.from("assistant_qa").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
