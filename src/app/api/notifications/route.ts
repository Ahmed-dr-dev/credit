import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  const { session, res } = await requireAuth();
  if (res) return res;

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", session!.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function PATCH() {
  const { session, res } = await requireAuth();
  if (res) return res;

  const { error } = await supabase
    .from("notifications")
    .update({ lue: true })
    .eq("user_id", session!.id)
    .eq("lue", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
