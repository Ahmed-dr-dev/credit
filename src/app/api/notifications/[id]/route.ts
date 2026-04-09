import { NextResponse } from "next/server";
import { supabaseServer, hasServiceRole } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/api-auth";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, res } = await requireAuth();
  if (res) return res;

  if (!hasServiceRole()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY manquant côté serveur." },
      { status: 503 }
    );
  }

  const { id } = await params;

  const { data, error } = await supabaseServer
    .from("notifications")
    .update({ lue: true })
    .eq("id", id)
    .eq("user_id", session!.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
