import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireRole } from "@/lib/api-auth";

type Ctx = { params: { id: string } };

// PATCH — admin answers the question: marks as repondu + promotes to assistant_qa
export async function PATCH(req: Request, { params }: Ctx) {
  const { res } = await requireRole(["admin"]);
  if (res) return res;

  const body = await req.json() as { keywords?: string; reponse?: string; dismiss?: boolean };

  if (body.dismiss) {
    // Just dismiss (mark as answered without adding to QA)
    const { error } = await supabase
      .from("assistant_pending")
      .update({ repondu: true, updated_at: new Date().toISOString() })
      .eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (!body.keywords?.trim() || !body.reponse?.trim()) {
    return NextResponse.json({ error: "Mots-clés et réponse requis" }, { status: 400 });
  }

  // 1. Add to assistant_qa
  const { error: qaErr } = await supabase.from("assistant_qa").insert({
    keywords: body.keywords.trim(),
    response: body.reponse.trim(),
    actif: true,
  });
  if (qaErr) return NextResponse.json({ error: qaErr.message }, { status: 500 });

  // 2. Mark pending question as answered
  const { error: pendErr } = await supabase
    .from("assistant_pending")
    .update({ repondu: true, updated_at: new Date().toISOString() })
    .eq("id", params.id);
  if (pendErr) return NextResponse.json({ error: pendErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE — admin permanently removes a pending question
export async function DELETE(_req: Request, { params }: Ctx) {
  const { res } = await requireRole(["admin"]);
  if (res) return res;

  const { error } = await supabase.from("assistant_pending").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
