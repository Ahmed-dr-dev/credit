import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth, requireRole } from "@/lib/api-auth";

export async function GET(req: Request) {
  const { session, res } = await requireAuth();
  if (res) return res;

  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut");

  if (session!.role === "client") {
    let q = supabase
      .from("reclamations")
      .select("*")
      .eq("client_id", session!.id)
      .order("created_at", { ascending: false });
    if (statut) q = q.eq("statut", statut);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  }

  if (session!.role === "admin") {
    let q = supabase
      .from("reclamations")
      .select(`
        *,
        client:profiles!client_id(prenom, nom, email)
      `)
      .order("created_at", { ascending: false });
    if (statut) q = q.eq("statut", statut);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  }

  return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
}

export async function POST(req: Request) {
  const { session, res } = await requireRole(["client"]);
  if (res) return res;

  const body = await req.json();
  const { sujet, message } = body;
  if (!sujet?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Sujet et message requis" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("reclamations")
    .insert({ client_id: session!.id, sujet: sujet.trim(), message: message.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
