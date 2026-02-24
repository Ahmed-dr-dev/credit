import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth, requireRole } from "@/lib/api-auth";

export async function GET() {
  const { session, res } = await requireAuth();
  if (res) return res;

  const { data, error } = await supabase
    .from("types_credit")
    .select("*")
    .order("nom");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { res } = await requireRole(["admin"]);
  if (res) return res;

  const body = await req.json();
  const { nom, description, duree_max, montant_max } = body;
  if (!nom?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

  const { data, error } = await supabase
    .from("types_credit")
    .insert({
      nom: nom.trim(),
      description: description?.trim() || null,
      duree_max: duree_max?.trim() || null,
      montant_max: montant_max?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
