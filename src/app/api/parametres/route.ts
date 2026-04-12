import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireRole } from "@/lib/api-auth";

// Default parameters seeded if the table is empty
const DEFAULTS = [
  // ── Taux d'intérêt ────────────────────────────────────────────
  { cle: "taux_immobilier",     valeur: "7.5",  label: "Taux d'intérêt — Crédit immobilier",     unite: "%",    groupe: "taux",    description: "Taux annuel appliqué aux crédits immobiliers." },
  { cle: "taux_consommation",   valeur: "12",   label: "Taux d'intérêt — Crédit à la consommation", unite: "%", groupe: "taux",    description: "Taux annuel appliqué aux crédits à la consommation." },
  { cle: "taux_professionnel",  valeur: "9",    label: "Taux d'intérêt — Crédit professionnel",  unite: "%",    groupe: "taux",    description: "Taux annuel appliqué aux crédits professionnels." },
  // ── Durées maximales ──────────────────────────────────────────
  { cle: "duree_max_immobilier",    valeur: "360", label: "Durée max — Crédit immobilier",    unite: "mois", groupe: "duree",   description: "Durée maximale accordée (en mois)." },
  { cle: "duree_max_consommation",  valeur: "84",  label: "Durée max — Crédit à la consommation", unite: "mois", groupe: "duree", description: "Durée maximale accordée (en mois)." },
  { cle: "duree_max_professionnel", valeur: "120", label: "Durée max — Crédit professionnel", unite: "mois", groupe: "duree",   description: "Durée maximale accordée (en mois)." },
  // ── Montants maximaux ─────────────────────────────────────────
  { cle: "montant_max_immobilier",    valeur: "500000", label: "Montant max — Crédit immobilier",    unite: "DT", groupe: "montant", description: "Montant maximum finançable." },
  { cle: "montant_max_consommation",  valeur: "50000",  label: "Montant max — Crédit à la consommation", unite: "DT", groupe: "montant", description: "Montant maximum finançable." },
  { cle: "montant_max_professionnel", valeur: "300000", label: "Montant max — Crédit professionnel", unite: "DT", groupe: "montant", description: "Montant maximum finançable." },
  // ── Frais & conditions ────────────────────────────────────────
  { cle: "frais_dossier",      valeur: "1",  label: "Frais de dossier",          unite: "%",    groupe: "frais", description: "Pourcentage du montant emprunté (frais de traitement)." },
  { cle: "apport_min_immobilier", valeur: "10", label: "Apport minimum — Immobilier", unite: "%", groupe: "frais", description: "Apport personnel minimum requis pour le crédit immobilier." },
  { cle: "assurance_taux",     valeur: "0.3", label: "Taux d'assurance emprunteur", unite: "%/an", groupe: "frais", description: "Taux annuel de l'assurance emprunteur (décès/invalidité)." },
];

export async function GET() {
  const { res } = await requireRole(["admin"]);
  if (res) return res;

  const { data, error } = await supabase
    .from("parametres")
    .select("*")
    .order("groupe")
    .order("cle");

  if (error) {
    // If table doesn't exist yet, return defaults
    return NextResponse.json(DEFAULTS.map((d) => ({ ...d, id: d.cle, updated_at: null })));
  }

  // If table is empty, return defaults
  if (!data || data.length === 0) {
    return NextResponse.json(DEFAULTS.map((d) => ({ ...d, id: d.cle, updated_at: null })));
  }

  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const { res } = await requireRole(["admin"]);
  if (res) return res;

  const body = await req.json() as { cle: string; valeur: string }[];

  if (!Array.isArray(body) || body.length === 0) {
    return NextResponse.json({ error: "Tableau de { cle, valeur } requis" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const results = [];

  for (const { cle, valeur } of body) {
    if (!cle || valeur === undefined) continue;

    const def = DEFAULTS.find((d) => d.cle === cle);
    if (!def) continue;

    // Upsert: insert if not exists, update if exists
    const { data, error } = await supabase
      .from("parametres")
      .upsert({
        cle,
        valeur: String(valeur),
        label: def.label,
        unite: def.unite,
        groupe: def.groupe,
        description: def.description,
        updated_at: now,
      }, { onConflict: "cle" })
      .select()
      .single();

    if (!error && data) results.push(data);
  }

  return NextResponse.json(results);
}
