import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { cookies } from "next/headers";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, res } = await requireAuth();
  if (res) return res;

  const { id } = await params;

  if (session!.role !== "admin" && session!.id !== id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json();
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Only include fields that are explicitly provided and non-empty
  if (body.prenom?.trim())     update.prenom    = body.prenom.trim();
  if (body.nom?.trim())        update.nom       = body.nom.trim();

  // Telephone: allow clearing (empty string → null)
  if ("telephone" in body) update.telephone = body.telephone?.trim() || null;

  // Email change: only if provided and different
  if (body.email?.trim()) {
    const newEmail = body.email.trim().toLowerCase();
    const { data: current } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", id)
      .single();

    if (current && newEmail !== current.email) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", newEmail)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: "Cette adresse email est déjà utilisée." }, { status: 409 });
      }
      update.email = newEmail;
    }
  }

  // Password: only if provided
  if (body.password?.trim()) {
    const bcrypt = await import("bcryptjs");
    update.password_hash = await bcrypt.hash(body.password.trim(), 10);
  }

  // Nothing meaningful to update (only timestamp)
  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: "Aucune modification fournie." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", id)
    .select("id, email, role, prenom, nom, telephone, created_at, compte_bancaire_actif")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, res } = await requireAuth();
  if (res) return res;

  const { id } = await params;

  // Only the account owner (or an admin) can delete
  if (session!.role !== "admin" && session!.id !== id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Clients can only delete their own account while it has no active bank account
  if (session!.role === "client") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("compte_bancaire_actif")
      .eq("id", id)
      .single();

    if (profile?.compte_bancaire_actif) {
      return NextResponse.json(
        { error: "Votre compte bancaire est actif. Contactez votre conseiller pour clôturer votre compte." },
        { status: 403 }
      );
    }
  }

  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Clear session cookie
  const cookieStore = await cookies();
  cookieStore.delete("session");

  return NextResponse.json({ ok: true });
}
