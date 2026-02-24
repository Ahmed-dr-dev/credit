import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

const UPLOAD_DIR = "public/uploads";

export async function GET(req: Request) {
  const { session, res } = await requireAuth();
  if (res) return res;

  const { searchParams } = new URL(req.url);
  const demandeId = searchParams.get("demandeId");
  if (!demandeId) return NextResponse.json({ error: "demandeId requis" }, { status: 400 });

  const { data: demande } = await supabase
    .from("demandes")
    .select("client_id, responsable_id")
    .eq("id", demandeId)
    .single();

  if (!demande) return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
  const canAccess =
    session!.role === "admin" ||
    demande.client_id === session!.id ||
    demande.responsable_id === session!.id;
  if (!canAccess) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("demande_id", demandeId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

function sanitizeFileName(name: string): string {
  const ext = path.extname(name) || "";
  const base = path.basename(name, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return base + ext;
}

export async function POST(req: Request) {
  const { session, res } = await requireAuth();
  if (res) return res;

  const contentType = req.headers.get("content-type") ?? "";
  let demande_id: string;
  let nom: string;
  let fichier_url: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    demande_id = (formData.get("demande_id") as string) ?? "";
    nom = (formData.get("nom") as string)?.trim() ?? "";

    if (!file || file.size === 0) return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    if (!demande_id || !nom) return NextResponse.json({ error: "demande_id et nom requis" }, { status: 400 });

    const { data: demande } = await supabase.from("demandes").select("client_id").eq("id", demande_id).single();
    if (!demande || demande.client_id !== session!.id) {
      return NextResponse.json({ error: "Demande non trouvée ou accès refusé" }, { status: 403 });
    }

    const safeName = sanitizeFileName(file.name);
    const filename = `${demande_id}-${Date.now()}-${safeName}`;
    const dir = path.join(process.cwd(), UPLOAD_DIR);
    await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));
    fichier_url = `/uploads/${filename}`;
  } else {
    const body = await req.json();
    demande_id = body.demande_id;
    nom = body.nom?.trim();
    fichier_url = body.fichier_url ?? null;
    if (!demande_id || !nom) return NextResponse.json({ error: "demande_id et nom requis" }, { status: 400 });

    const { data: demande } = await supabase.from("demandes").select("client_id").eq("id", demande_id).single();
    if (!demande || demande.client_id !== session!.id) {
      return NextResponse.json({ error: "Demande non trouvée ou accès refusé" }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({ demande_id, nom, fichier_url })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
