"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

type Stats = {
  total: number;
  enAttente: number;
  enCours: number;
  validees: number;
  refusees: number;
};

export default function AdminStatistiques() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ total: 0, enAttente: 0, enCours: 0, validees: 0, refusees: 0 });

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "admin")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role !== "admin") return;
    fetch("/api/demandes", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((demandes: { statut: string }[]) => {
        const total = demandes.length;
        const enAttente = demandes.filter((d) => d.statut === "en_attente").length;
        const enCours = demandes.filter((d) =>
          ["en_cours_etude", "en_attente_infos"].includes(d.statut)
        ).length;
        const validees = demandes.filter((d) => d.statut === "validee").length;
        const refusees = demandes.filter((d) => d.statut === "refusee").length;
        setStats({ total, enAttente, enCours, validees, refusees });
      });
  }, [role]);

  if (!isAuthenticated || role !== "admin") return null;

  const { total, enAttente, enCours, validees, refusees } = stats;
  const tauxAcceptation =
    validees + refusees > 0 ? Math.round((validees / (validees + refusees)) * 100) : 0;

  return (
    <DashboardLayout role="admin" title="Consultation des statistiques">
      <p className="text-slate-600 text-sm mb-6">
        Statistiques globales sur les demandes de crédit : nombre, taux d&apos;acceptation, etc.
      </p>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total demandes" value={String(total)} />
        <StatCard label="En attente" value={String(enAttente)} />
        <StatCard label="En cours d'étude" value={String(enCours)} />
        <StatCard label="Validées" value={String(validees)} />
        <StatCard label="Refusées" value={String(refusees)} />
        <StatCard label="Taux d'acceptation" value={`${tauxAcceptation} %`} className="md:col-span-2" />
      </div>
      <section className="mt-8 bg-white rounded-xl border border-slate-200 p-6 shadow-card">
        <h3 className="text-base font-semibold text-slate-800 mb-4">Répartition par statut</h3>
        <div className="flex flex-wrap gap-6 items-end h-32">
          <div className="text-center">
            <div
              className="w-14 bg-slate-200 rounded-t mx-auto"
              style={{ height: `${total > 0 ? (enAttente / total) * 96 : 0}px`, minHeight: "8px" }}
            />
            <p className="text-xs text-slate-600 mt-2">Attente</p>
            <p className="text-sm font-medium">{enAttente}</p>
          </div>
          <div className="text-center">
            <div
              className="w-14 bg-amber-200 rounded-t mx-auto"
              style={{ height: `${total > 0 ? (enCours / total) * 96 : 0}px`, minHeight: "8px" }}
            />
            <p className="text-xs text-slate-600 mt-2">En cours</p>
            <p className="text-sm font-medium">{enCours}</p>
          </div>
          <div className="text-center">
            <div
              className="w-14 bg-green-200 rounded-t mx-auto"
              style={{ height: `${total > 0 ? (validees / total) * 96 : 0}px`, minHeight: "8px" }}
            />
            <p className="text-xs text-slate-600 mt-2">Validées</p>
            <p className="text-sm font-medium">{validees}</p>
          </div>
          <div className="text-center">
            <div
              className="w-14 bg-red-200 rounded-t mx-auto"
              style={{ height: `${total > 0 ? (refusees / total) * 96 : 0}px`, minHeight: "8px" }}
            />
            <p className="text-xs text-slate-600 mt-2">Refusées</p>
            <p className="text-sm font-medium">{refusees}</p>
          </div>
        </div>
      </section>
      <section className="mt-6 bg-white rounded-xl border border-slate-200 p-6 shadow-card">
        <h3 className="text-base font-semibold text-slate-800 mb-2">Graphiques et rapports</h3>
        <p className="text-slate-600 text-sm">
          Évolution dans le temps, répartition par type de crédit — à enrichir selon besoins.
        </p>
      </section>
    </DashboardLayout>
  );
}

function StatCard({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200/80 p-5 shadow-card ${className}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-800">{value}</p>
    </div>
  );
}
