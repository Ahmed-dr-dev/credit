import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseServer, hasServiceRole } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/api-auth";

async function createNotif(userId: string, message: string, rdvId: string) {
  if (!hasServiceRole()) return;
  await supabaseServer.from("notifications").insert({
    user_id: userId,
    message,
    rdv_id: rdvId,
    lue: false,
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, res } = await requireAuth();
  if (res) return res;

  const { id } = await params;
  const body = await req.json();

  const { data: rdv, error: fetchErr } = await supabase
    .from("rendez_vous")
    .select("agent_id, client_id, motif")
    .eq("id", id)
    .single();

  if (fetchErr || !rdv) {
    return NextResponse.json({ error: "RDV non trouvé" }, { status: 404 });
  }

  const isAgent = session!.role === "agent" && rdv.agent_id === session!.id;
  const isClient = session!.role === "client" && rdv.client_id === session!.id;
  const isAdmin = session!.role === "admin";

  if (!isAgent && !isClient && !isAdmin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const update: Record<string, unknown> = {};

  if (isAgent || isAdmin) {
    if (body.statut != null) update.statut = body.statut;
    if (body.date_proposee !== undefined) {
      update.date_proposee = body.date_proposee
        ? new Date(body.date_proposee).toISOString()
        : null;
    }
  }

  if (isClient) {
    const allowed = ["confirme", "contre_client"];
    if (!body.statut || !allowed.includes(body.statut)) {
      return NextResponse.json({ error: "Action non autorisée pour le client" }, { status: 403 });
    }
    update.statut = body.statut;
    if (body.date_demandee !== undefined) {
      update.date_demandee = body.date_demandee
        ? new Date(body.date_demandee).toISOString()
        : null;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Rien à modifier" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("rendez_vous")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("[PATCH /api/rendez-vous]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Notifications ──────────────────────────────────────────────
  const motif = rdv.motif ? `« ${rdv.motif} »` : "";
  const newStatut = update.statut as string | undefined;

  if (newStatut === "alt_agent") {
    const dateStr = body.date_proposee
      ? new Date(body.date_proposee).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })
      : "";
    await createNotif(
      rdv.client_id,
      `📅 Votre conseiller vous propose une nouvelle date${dateStr ? ` : ${dateStr}` : ""} pour le rendez-vous ${motif}.`,
      id
    );
  }

  if (newStatut === "contre_client") {
    const dateStr = body.date_demandee
      ? new Date(body.date_demandee).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })
      : "";
    await createNotif(
      rdv.agent_id,
      `🔄 Le client contre-propose une nouvelle date${dateStr ? ` : ${dateStr}` : ""} pour le rendez-vous ${motif}.`,
      id
    );
  }

  if (newStatut === "confirme" && isAgent) {
    await createNotif(
      rdv.client_id,
      `✅ Votre rendez-vous ${motif} a été confirmé par votre conseiller.`,
      id
    );
  }

  if (newStatut === "confirme" && isClient) {
    await createNotif(
      rdv.agent_id,
      `✅ Le client a accepté la date proposée pour le rendez-vous ${motif}.`,
      id
    );
  }

  if (newStatut === "passe") {
    await createNotif(
      rdv.client_id,
      `📋 Votre rendez-vous ${motif} a été marqué comme passé.`,
      id
    );
  }
  // ────────────────────────────────────────────────────────────────

  return NextResponse.json(data);
}
