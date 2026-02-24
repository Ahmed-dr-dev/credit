import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireRole } from "@/lib/api-auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { res } = await requireRole(["admin"]);
  if (res) return res;

  const { id } = await params;
  const body = await req.json();
  if (body.statut == null) return NextResponse.json({ error: "statut requis" }, { status: 400 });

  const { data, error } = await supabase
    .from("reclamations")
    .update({ statut: body.statut })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
