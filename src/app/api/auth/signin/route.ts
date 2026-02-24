import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyPassword, createSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, email, password_hash, role")
      .ilike("email", email.trim())
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
    }

    const valid = await verifyPassword(password, profile.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
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
