import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireRole } from "@/lib/api-auth";

export async function GET() {
  const { res } = await requireRole(["admin"]);
  if (res) return res;

  const { data, error } = await supabase
    .from("comptes_bancaires")
    .select(`
      id, client_id, numero_compte, iban, banque, date_ouverture, created_at,
      client:profiles!client_id(prenom, nom, email)
    `)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const { res } = await requireRole(["admin"]);
  if (res) return res;

  const body = await req.json();
  const { client_id, numero_compte, iban, banque, date_ouverture } = body;
  if (!client_id || !numero_compte?.trim() || !banque?.trim()) {
    return NextResponse.json(
      { error: "client_id, numero_compte et banque requis" },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from("comptes_bancaires")
    .select("id")
    .eq("client_id", client_id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "Ce client possède déjà un compte bancaire enregistré" },
      { status: 409 }
    );
  }

  const { data: compte, error: errCompte } = await supabase
    .from("comptes_bancaires")
    .insert({
      client_id,
      numero_compte: numero_compte.trim(),
      iban: iban?.trim() || null,
      banque: banque.trim(),
      date_ouverture: date_ouverture || new Date().toISOString().slice(0, 10),
    })
    .select(`
      id, client_id, numero_compte, iban, banque, date_ouverture, created_at,
      client:profiles!client_id(prenom, nom, email)
    `)
    .single();

  if (errCompte) return NextResponse.json({ error: errCompte.message }, { status: 500 });

  const { error: errProfile } = await supabase
    .from("profiles")
    .update({ compte_bancaire_actif: true })
    .eq("id", client_id);

  if (errProfile) return NextResponse.json({ error: errProfile.message }, { status: 500 });

  return NextResponse.json(compte);
}
