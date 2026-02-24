"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none";

export default function AdminDashboard() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ attente: 0, enCours: 0, clients: 0, responsables: 0 });

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "admin")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role !== "admin") return;
    Promise.all([
      fetch("/api/demandes", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/profiles?role=client", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/profiles?role=agent", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
    ]).then(([demandes, clients, agents]) => {
      const attente = demandes.filter((d: { statut: string }) => d.statut === "en_attente").length;
      const enCours = demandes.filter((d: { statut: string }) =>
        ["en_cours_etude", "en_attente_infos"].includes(d.statut)
      ).length;
      setStats({ attente, enCours, clients: clients.length, responsables: agents.length });
    });
  }, [role]);

  if (!isAuthenticated || role !== "admin") return null;

  return (
    <DashboardLayout role="admin" title="Espace Administration">
      <p className="text-slate-600 text-sm mb-6">
        Authentification, gestion des comptes (clients et responsables), supervision et affectation
        des demandes, suivi global, statistiques et réclamations.
      </p>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/admin/demandes" className="block">
          <Card title="Demandes en attente" value={String(stats.attente)} />
        </Link>
        <Link href="/dashboard/admin/demandes" className="block">
          <Card title="Demandes en cours" value={String(stats.enCours)} />
        </Link>
        <Link href="/dashboard/admin/clients" className="block">
          <Card title="Comptes clients" value={String(stats.clients)} />
        </Link>
        <Link href="/dashboard/admin/agents" className="block">
          <Card title="Comptes responsables" value={String(stats.responsables)} />
        </Link>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/dashboard/admin/statistiques" className="px-4 py-2 rounded-lg bg-primary-50 text-primary-700 font-medium text-sm hover:bg-primary-100 transition">Statistiques</Link>
        <Link href="/dashboard/admin/reclamations" className="px-4 py-2 rounded-lg bg-primary-50 text-primary-700 font-medium text-sm hover:bg-primary-100 transition">Réclamations</Link>
        <Link href="/dashboard/admin/demandes" className="px-4 py-2 rounded-lg bg-primary-50 text-primary-700 font-medium text-sm hover:bg-primary-100 transition">Demandes & affectation</Link>
        <Link href="/dashboard/admin/types-credit" className="px-4 py-2 rounded-lg bg-primary-50 text-primary-700 font-medium text-sm hover:bg-primary-100 transition">Types de crédit</Link>
      </div>
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
