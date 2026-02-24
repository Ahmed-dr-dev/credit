import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireRole } from "@/lib/api-auth";

export async function GET(req: Request) {
  const { session, res } = await requireRole(["admin"]);
  if (res) return res;

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");

  let q = supabase.from("profiles").select("id, email, role, prenom, nom, telephone").order("nom");

  if (role) q = q.eq("role", role);
  const { data, error } = await q;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { session, res } = await requireRole(["admin"]);
  if (res) return res;

  const body = await req.json();
  const { prenom, nom, email, password, telephone, role } = body;
  if (!prenom?.trim() || !nom?.trim() || !email?.trim() || !role) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const bcrypt = await import("bcryptjs");
  const password_hash = password?.trim() ? await bcrypt.hash(password.trim(), 10) : null;
  if (role !== "admin" && !password_hash) {
    return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
  }

  const em = email.toLowerCase().trim();
  const insert: Record<string, unknown> = {
    email: em,
    role,
    prenom: prenom.trim(),
    nom: nom.trim(),
    telephone: telephone?.trim() || null,
  };
  if (password_hash) insert.password_hash = password_hash;

  const { data, error } = await supabase.from("profiles").insert(insert).select("id, email, role, prenom, nom, telephone").single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Cet email existe déjà" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
