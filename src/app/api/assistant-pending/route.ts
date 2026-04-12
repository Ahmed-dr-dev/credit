import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { requireRole } from "@/lib/api-auth";

// POST — public, no auth required: record an unanswered user question
export async function POST(req: Request) {
  let body: { question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const q = body.question?.trim();
  if (!q) return NextResponse.json({ error: "Question vide" }, { status: 400 });

  // Increment nb_fois if the same question already exists (case-insensitive, not yet answered)
  const { data: existing, error: selectErr } = await supabaseServer
    .from("assistant_pending")
    .select("id, nb_fois")
    .ilike("question", q)
    .eq("repondu", false)
    .maybeSingle();

  if (selectErr) {
    // Table may not exist yet — fail silently so the chat UX isn't broken
    return NextResponse.json({ ok: true, skipped: true });
  }

  if (existing) {
    await supabaseServer
      .from("assistant_pending")
      .update({ nb_fois: (existing.nb_fois ?? 1) + 1, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    return NextResponse.json({ merged: true });
  }

  const { error: insErr } = await supabaseServer.from("assistant_pending").insert({
    question: q,
    nb_fois: 1,
    repondu: false,
  });

  if (insErr) {
    return NextResponse.json({ error: insErr.message, code: insErr.code }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

// GET — admin only: list pending unanswered questions
export async function GET() {
  const { res } = await requireRole(["admin"]);
  if (res) return res;

  const { data, error } = await supabaseServer
    .from("assistant_pending")
    .select("*")
    .order("repondu")
    .order("nb_fois", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
