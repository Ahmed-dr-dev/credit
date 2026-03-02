import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireRole } from "@/lib/api-auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, res } = await requireRole(["admin"]);
  if (res) return res;

  const { id } = await params;
  const body = await req.json();
  const { prenom, nom, email, telephone, password } = body;

  const update: Record<string, unknown> = {};
  if (prenom != null) update.prenom = String(prenom).trim();
  if (nom != null) update.nom = String(nom).trim();
  if (email != null) update.email = String(email).toLowerCase().trim();
  if (telephone !== undefined) update.telephone = telephone?.trim() || null;
  if (body.compte_bancaire_actif !== undefined) update.compte_bancaire_actif = !!body.compte_bancaire_actif;
  if (password?.trim()) {
    const bcrypt = await import("bcryptjs");
    update.password_hash = await bcrypt.hash(password.trim(), 10);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Rien à modifier" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", id)
    .select("id, email, role, prenom, nom, telephone, compte_bancaire_actif")
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Cet email existe déjà" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { res } = await requireRole(["admin"]);
  if (res) return res;

  const { id } = await params;
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
