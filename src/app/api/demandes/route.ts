import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth, requireRole } from "@/lib/api-auth";

export async function GET(req: Request) {
  const { session, res } = await requireAuth();
  if (res) return res;

  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut");

  if (session!.role === "client") {
    const { data, error } = await supabase
      .from("demandes")
      .select(`
        id, montant, duree, statut, type_nom, created_at,
        type_credit:types_credit(nom, description)
      `)
      .eq("client_id", session!.id)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  }

  if (session!.role === "agent") {
    let q = supabase
      .from("demandes")
      .select(`
        id, client_id, montant, duree, statut, type_nom, created_at,
        client:profiles!client_id(prenom, nom, email),
        type_credit:types_credit(nom)
      `)
      .eq("responsable_id", session!.id)
      .order("created_at", { ascending: false });
    if (statut) q = q.eq("statut", statut);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  }

  if (session!.role === "admin") {
    let q = supabase
      .from("demandes")
      .select(`
        id, montant, duree, statut, type_nom, responsable_id, created_at,
        client:profiles!client_id(prenom, nom, email),
        responsable:profiles!responsable_id(prenom, nom),
        type_credit:types_credit(nom)
      `)
      .order("created_at", { ascending: false });
    if (statut) q = q.eq("statut", statut);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  }

  return NextResponse.json({ error: "Rôle non géré" }, { status: 403 });
}

export async function POST(req: Request) {
  const { session, res } = await requireRole(["client"]);
  if (res) return res;

  const body = await req.json();
  const { type_credit_id, type_nom, montant, duree } = body;
  if (!montant?.trim() || !duree?.trim()) {
    return NextResponse.json({ error: "Montant et durée requis" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("demandes")
    .insert({
      client_id: session!.id,
      type_credit_id: type_credit_id || null,
      type_nom: type_nom?.trim() || null,
      montant: montant.trim(),
      duree: duree.trim(),
    })
    .select(`
      id, montant, duree, statut, type_nom, created_at,
      type_credit:types_credit(nom)
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
