import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { hashPassword, createSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { prenom, nom, email, telephone, password } = await req.json();
    if (!prenom?.trim() || !nom?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    const em = email.toLowerCase().trim();
    const { data: existing } = await supabase.from("profiles").select("id").eq("email", em).single();
    if (existing) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }

    const password_hash = await hashPassword(password);
    const { data: profile, error } = await supabase
      .from("profiles")
      .insert({
        email: em,
        password_hash,
        role: "client",
        prenom: prenom.trim(),
        nom: nom.trim(),
        telephone: telephone?.trim() || null,
        compte_bancaire_actif: false,
      })
      .select("id, email, role")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const token = await createSession({
      id: profile.id,
      email: profile.email,
      role: profile.role,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      id: profile.id,
      email: profile.email,
      role: profile.role,
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
