"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

type Demande = { id: string; statut: string; type_nom: string | null; montant: string };

export default function DemandeHub() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const [derniere, setDerniere] = useState<Demande | null>(null);

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "client")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role !== "client") return;
    fetch("/api/demandes", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Demande[]) => setDerniere(d[0] ?? null));
  }, [role]);

  if (!isAuthenticated || role !== "client") return null;

  const hasActive = derniere && derniere.statut !== "refusee";

  const cards = [
    {
      href: "/dashboard/client/demande/nouvelle",
      icon: "📋",
      title: "Nouvelle demande",
      desc: "Soumettez une demande de crédit en renseignant le type, le montant et la durée souhaitée.",
      cta: "Déposer une demande",
      color: "border-primary-200 hover:border-primary-400",
      badge: hasActive ? { label: "Demande active", style: "bg-amber-100 text-amber-700" } : null,
    },
    {
      href: "/dashboard/client/demande/suivi",
      icon: "🔍",
      title: "Suivi de ma demande",
      desc: "Consultez l'état de traitement de votre dossier, les étapes franchies et les actions requises.",
      cta: "Voir le suivi",
      color: "border-slate-200 hover:border-primary-300",
      badge: derniere
        ? { label: derniere.type_nom ?? "Dossier en cours", style: "bg-primary-100 text-primary-700" }
        : null,
    },
  ];

  return (
    <DashboardLayout role="client" title="Ma demande de crédit">
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Ma demande de crédit</h1>
          <p className="mt-1 text-slate-500 text-sm">
            Gérez votre dossier crédit : soumettez une nouvelle demande ou suivez l&apos;avancement de votre dossier.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`group flex flex-col bg-white rounded-2xl border-2 p-6 shadow-card transition ${card.color}`}
            >
              <div className="flex items-start justify-between mb-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-2xl group-hover:bg-primary-100 transition">
                  {card.icon}
                </span>
                {card.badge && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${card.badge.style}`}>
                    {card.badge.label}
                  </span>
                )}
              </div>
              <h2 className="font-bold text-slate-800 text-base mb-1">{card.title}</h2>
              <p className="text-sm text-slate-500 flex-1 leading-relaxed">{card.desc}</p>
              <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 group-hover:gap-2.5 transition-all">
                {card.cta} <span>→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick status strip */}
        {derniere && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-600">
              Dernier dossier :{" "}
              <span className="font-semibold text-slate-800">{derniere.type_nom || "—"} · {derniere.montant} TND</span>
            </div>
            <Link
              href="/dashboard/client/demande/suivi"
              className="text-xs font-medium text-primary-600 hover:underline"
            >
              Voir le détail →
            </Link>
          </div>
        )}

        {/* Quick links */}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/dashboard/client/documents" className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-card">
            📁 Documents
          </Link>
          <Link href="/dashboard/client/rendez-vous" className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-card">
            📅 Rendez-vous
          </Link>
          <Link href="/dashboard/client/documentation" className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-card">
            📖 Documentation
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
