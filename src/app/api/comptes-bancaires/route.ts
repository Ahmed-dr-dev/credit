import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireRole } from "@/lib/api-auth";

// ── Helpers ────────────────────────────────────────────────────────────────

function generateNumeroCompte(seq: number): string {
  // Format: BNA + 8-digit zero-padded sequence  e.g. BNA00000001
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
  // Tunisian IBAN structure:
  // TN + 2 check digits + bank(2) + agency(3) + account(11) + key(2) + pad(2)
  // BNA bank code: 14, agency: 00100, key: 00
  const bank = "14";
  const agency = "00100";
  const account = String(seq).padStart(11, "0");
  const key = "00";
  const bban = bank + agency + account + key;           // 18 digits

  // Compute check digits: move "TN00" to end, replace letters
  // T=29 N=23
  const rearranged = bban + "292300";                   // TN = 29,23 + "00" placeholder
  const checkDigits = String(98 - mod97(rearranged)).padStart(2, "0");

  const raw = `TN${checkDigits}${bban}`;
  // Format with space every 4 chars
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

  // Auto-generate account number, IBAN and date
  const seq = await nextSequence();
  const numero_compte = generateNumeroCompte(seq);
  const iban = generateIBAN(seq);
  const date_ouverture = new Date().toISOString().slice(0, 10);

  const { data: compte, error: errCompte } = await supabase
    .from("comptes_bancaires")
    .insert({
      client_id,
      numero_compte,
      iban,
      banque: banque.trim(),
      date_ouverture,
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
