import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

// Returns agents list for authenticated users (clients need it for RDV booking)
export async function GET() {
  const { res } = await requireAuth();
  if (res) return res;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, prenom, nom, email")
    .eq("role", "agent")
    .order("nom");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
