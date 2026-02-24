import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth, requireRole } from "@/lib/api-auth";

export async function GET(req: Request) {
  const { session, res } = await requireAuth();
  if (res) return res;

  if (session!.role !== "client") {
    return NextResponse.json({ error: "Réservé aux clients" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("nouveautes")
    .select("*")
    .eq("client_id", session!.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const { session, res } = await requireRole(["admin", "agent"]);
  if (res) return res;

  const body = await req.json();
  const { client_id, demande_id, titre, description, type_nouveaute } = body;
  if (!client_id || !titre?.trim()) {
    return NextResponse.json({ error: "client_id et titre requis" }, { status: 400 });
  }

  if (session!.role === "agent") {
    const { data: demande } = await supabase
      .from("demandes")
      .select("id")
      .eq("client_id", client_id)
      .eq("responsable_id", session!.id)
      .limit(1)
      .maybeSingle();
    if (!demande) {
      return NextResponse.json({ error: "Ce client ne fait pas partie de vos dossiers" }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from("nouveautes")
    .insert({
      client_id,
      demande_id: demande_id || null,
      titre: titre.trim(),
      description: description?.trim() || null,
      type_nouveaute: type_nouveaute?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
