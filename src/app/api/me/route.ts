import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  const { session, res } = await requireAuth();
  if (res) return res;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, role, prenom, nom, telephone, compte_bancaire_actif")
    .eq("id", session!.id)
    .single();

  if (error || !profile) return NextResponse.json({ error: "Profil non trouvé" }, { status: 404 });
  return NextResponse.json(profile);
}
