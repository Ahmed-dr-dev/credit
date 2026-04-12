import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth, requireRole } from "@/lib/api-auth";

// ── Admin helpers (auto-generate for admin-created accounts) ───────────────

function generateNumeroCompte(seq: number): string {
  return `BNA${String(seq).padStart(8, "0")}`;
}

function mod97(str: string): number {
  let remainder = 0;
  for (const ch of str) {
    remainder = (remainder * 10 + parseInt(ch, 10)) % 97;
  }
  return remainder;
}

function generateIBAN(seq: number): string {
  const bank = "14";
  const agency = "00100";
  const account = String(seq).padStart(11, "0");
  const key = "00";
  const bban = bank + agency + account + key;
  const rearranged = bban + "292300";
  const checkDigits = String(98 - mod97(rearranged)).padStart(2, "0");
  const raw = `TN${checkDigits}${bban}`;
  return raw.replace(/(.{4})/g, "$1 ").trim();
}

async function nextSequence(): Promise<number> {
  const { data } = await supabase
    .from("comptes_bancaires")
    .select("numero_compte")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.numero_compte) return 1;
  const match = data.numero_compte.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) + 1 : 1;
}

// ── Routes ─────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const { session, res } = await requireAuth();
  if (res) return res;

  // Client: fetch only their own account
  if (session!.role === "client") {
    const { data, error } = await supabase
      .from("comptes_bancaires")
      .select("id, client_id, numero_compte, iban, banque, date_ouverture, created_at")
      .eq("client_id", session!.id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? null);
  }

  // Admin: fetch all
  const { res: adminRes } = await requireRole(["admin"]);
  if (adminRes) return adminRes;

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  let q = supabase
    .from("comptes_bancaires")
    .select(`id, client_id, numero_compte, iban, banque, date_ouverture, created_at,
      client:profiles!client_id(prenom, nom, email)`)
    .order("created_at", { ascending: false });

  if (clientId) q = q.eq("client_id", clientId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const { session, res } = await requireAuth();
  if (res) return res;

  const body = await req.json();

  // ── CLIENT: submit their real existing bank account ────────────────────
  if (session!.role === "client") {
    const { numero_compte, iban, banque } = body;

    if (!numero_compte?.trim() || !banque?.trim()) {
      return NextResponse.json(
        { error: "Numéro de compte et banque requis" },
        { status: 400 }
      );
    }

    // Check not already registered
    const { data: existing } = await supabase
      .from("comptes_bancaires")
      .select("id")
      .eq("client_id", session!.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Vous avez déjà un compte bancaire enregistré." },
        { status: 409 }
      );
    }

    const date_ouverture = new Date().toISOString().slice(0, 10);

    const { data: compte, error: errCompte } = await supabase
      .from("comptes_bancaires")
      .insert({
        client_id: session!.id,
        numero_compte: numero_compte.trim(),
        iban: iban?.trim() || null,
        banque: banque.trim(),
        date_ouverture,
      })
      .select("id, client_id, numero_compte, iban, banque, date_ouverture, created_at")
      .single();

    if (errCompte) return NextResponse.json({ error: errCompte.message }, { status: 500 });

    await supabase
      .from("profiles")
      .update({ compte_bancaire_actif: true })
      .eq("id", session!.id);

    return NextResponse.json(compte);
  }

  // ── ADMIN: auto-generate account number + IBAN ─────────────────────────
  const { res: adminRes } = await requireRole(["admin"]);
  if (adminRes) return adminRes;

  const { client_id, banque } = body;

  if (!client_id || !banque?.trim()) {
    return NextResponse.json(
      { error: "client_id et banque requis" },
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

  const seq = await nextSequence();
  const numero_compte = generateNumeroCompte(seq);
  const iban = generateIBAN(seq);
  const date_ouverture = new Date().toISOString().slice(0, 10);

  const { data: compte, error: errCompte } = await supabase
    .from("comptes_bancaires")
    .insert({ client_id, numero_compte, iban, banque: banque.trim(), date_ouverture })
    .select(`id, client_id, numero_compte, iban, banque, date_ouverture, created_at,
      client:profiles!client_id(prenom, nom, email)`)
    .single();

  if (errCompte) return NextResponse.json({ error: errCompte.message }, { status: 500 });

  await supabase
    .from("profiles")
    .update({ compte_bancaire_actif: true })
    .eq("id", client_id);

  return NextResponse.json(compte);
}
