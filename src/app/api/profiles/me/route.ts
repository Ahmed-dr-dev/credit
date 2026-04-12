import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  const { session, res } = await requireAuth();
  if (res) return res;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role, prenom, nom, telephone, created_at, compte_bancaire_actif")
    .eq("id", session!.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
