import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireRole } from "@/lib/api-auth";

export async function GET() {
  const { data, error } = await supabase
    .from("assistant_qa")
    .select("*")
    .eq("actif", true)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const { res } = await requireRole(["admin"]);
  if (res) return res;

  const body = await req.json();
  const { keywords, response } = body;
  if (!keywords?.trim() || !response?.trim()) {
    return NextResponse.json({ error: "Mots-clés et réponse requis" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("assistant_qa")
    .insert({ keywords: keywords.trim(), response: response.trim(), actif: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
