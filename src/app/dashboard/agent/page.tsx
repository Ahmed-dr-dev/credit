"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

export default function AgentDashboard() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ aTraiter: 0, rendezVous: 0, enCours: 0 });

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "agent")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role !== "agent") return;
    Promise.all([
      fetch("/api/demandes", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/rendez-vous", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
    ]).then(([demandes, rdvs]) => {
      const aTraiter = demandes.filter((d: { statut: string }) =>
        ["en_cours_etude", "en_attente_infos"].includes(d.statut)
      ).length;
      const rendezVous = rdvs.filter(
        (r: { statut: string }) => r.statut === "demande" || r.statut === "confirme"
      ).length;
      const enCours = demandes.filter((d: { statut: string }) =>
        ["en_cours_etude", "en_attente_infos"].includes(d.statut)
      ).length;
      setStats({ aTraiter, rendezVous, enCours });
    });
  }, [role]);

  if (!isAuthenticated || role !== "agent") return null;

  return (
    <DashboardLayout role="agent" title="Espace Responsable Bancaire">
      <p className="text-slate-600 text-sm mb-6">
        Consultez les demandes affectées, planifiez les rendez-vous et mettez à jour l&apos;avancement des dossiers.
      </p>
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Link href="/dashboard/agent/demandes" className="block">
          <Card title="Demandes à traiter" value={String(stats.aTraiter)} />
        </Link>
        <Link href="/dashboard/agent/rendez-vous" className="block">
          <Card title="Rendez-vous à venir" value={String(stats.rendezVous)} />
        </Link>
        <Link href="/dashboard/agent/demandes" className="block">
          <Card title="Dossiers en cours" value={String(stats.enCours)} />
        </Link>
      </div>
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
        <h3 className="text-base font-semibold text-slate-800 mb-2">Actions rapides</h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/agent/demandes" className="px-4 py-2 rounded-lg bg-primary-50 text-primary-700 font-medium text-sm hover:bg-primary-100 transition">Consultation des demandes</Link>
          <Link href="/dashboard/agent/dossiers" className="px-4 py-2 rounded-lg bg-primary-50 text-primary-700 font-medium text-sm hover:bg-primary-100 transition">Analyse des dossiers</Link>
          <Link href="/dashboard/agent/rendez-vous" className="px-4 py-2 rounded-lg bg-primary-50 text-primary-700 font-medium text-sm hover:bg-primary-100 transition">Rendez-vous</Link>
          <Link href="/dashboard/agent/rapports" className="px-4 py-2 rounded-lg bg-primary-50 text-primary-700 font-medium text-sm hover:bg-primary-100 transition">Exporter / Rapports</Link>
        </div>
      </section>
    </DashboardLayout>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card hover:shadow-cardHover transition overflow-hidden group">
      <div className="w-full h-1 -mx-5 -mt-5 mb-4 bg-gradient-to-r from-primary-400 to-primary-600" />
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-800">{value}</p>
    </div>
  );
}
