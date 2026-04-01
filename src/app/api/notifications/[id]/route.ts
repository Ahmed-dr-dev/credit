import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, res } = await requireAuth();
  if (res) return res;

  const { id } = await params;

  const { data, error } = await supabase
    .from("notifications")
    .update({ lue: true })
    .eq("id", id)
    .eq("user_id", session!.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
