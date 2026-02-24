import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    return { session: null, res: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  }
  return { session, res: null };
}

export async function requireRole(allowed: ("admin" | "agent" | "client")[]) {
  const { session, res } = await requireAuth();
  if (!session) return { session: null, res };
  if (!allowed.includes(session.role)) {
    return { session: null, res: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  }
  return { session, res: null };
}
