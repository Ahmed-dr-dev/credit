import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth, requireRole } from "@/lib/api-auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, res } = await requireAuth();
  if (res) return res;

  const { id } = await params;
  const body = await req.json();

  if (session!.role === "admin") {
    const update: Record<string, unknown> = {};
    if (body.statut != null) update.statut = body.statut;
    if (body.responsable_id !== undefined) update.responsable_id = body.responsable_id || null;
    if (body.statut === "en_cours_etude" && body.responsable_id) update.responsable_id = body.responsable_id;

    if (Object.keys(update).length === 0) return NextResponse.json({ error: "Rien à modifier" }, { status: 400 });

    const { data, error } = await supabase
      .from("demandes")
      .update(update)
      .eq("id", id)
      .select(`
        id, montant, duree, statut, type_nom, responsable_id, created_at,
        client:profiles!client_id(prenom, nom, email),
        responsable:profiles!responsable_id(prenom, nom)
      `)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (session!.role === "agent") {
    const { data: d } = await supabase.from("demandes").select("responsable_id").eq("id", id).single();
    if (!d || d.responsable_id !== session!.id) {
      return NextResponse.json({ error: "Demande non assignée" }, { status: 403 });
    }
    const update: Record<string, unknown> = {};
    if (body.statut != null) update.statut = body.statut;
    if (Object.keys(update).length === 0) return NextResponse.json({ error: "Rien à modifier" }, { status: 400 });

    const { data, error } = await supabase
      .from("demandes")
      .update(update)
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
}
