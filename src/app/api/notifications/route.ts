import { NextResponse } from "next/server";
import { supabaseServer, hasServiceRole } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  const { session, res } = await requireAuth();
  if (res) return res;

  if (!hasServiceRole()) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY manquant côté serveur. Les notifications nécessitent la clé service (contourne la RLS) avec l’auth personnalisée. Voir supabase-notifications.sql.",
      },
      { status: 503 }
    );
  }

  const { data, error } = await supabaseServer
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

  if (!hasServiceRole()) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY manquant côté serveur. Voir supabase-notifications.sql.",
      },
      { status: 503 }
    );
  }

  const { error } = await supabaseServer
    .from("notifications")
    .update({ lue: true })
    .eq("user_id", session!.id)
    .eq("lue", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
