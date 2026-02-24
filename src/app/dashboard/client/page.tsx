"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { DEMANDE_STATUTS } from "@/lib/statuts";

type Demande = {
  id: string;
  statut: string;
  montant: string;
  duree: string;
  type_nom: string | null;
  created_at: string;
  type_credit?: { nom: string } | null;
};
type RDV = {
  id: string;
  statut: string;
  date_proposee: string | null;
  motif: string | null;
  demande_id: string | null;
};

const statutBadgeClass: Record<string, string> = {
  en_attente: "bg-amber-100 text-amber-800",
  en_cours_etude: "bg-blue-100 text-blue-800",
  en_attente_infos: "bg-orange-100 text-orange-800",
  validee: "bg-green-100 text-green-800",
  refusee: "bg-red-100 text-red-800",
};

const QUICK_LINKS = [
  { href: "/dashboard/client/demande", label: "Ma demande", icon: "📋" },
  { href: "/dashboard/client/documents", label: "Documents", icon: "📁" },
  { href: "/dashboard/client/rendez-vous", label: "Rendez-vous", icon: "📅" },
  { href: "/dashboard/client/nouveautes", label: "Nouveautés", icon: "🔔" },
  { href: "/dashboard/client/reclamations", label: "Réclamations", icon: "✉️" },
  { href: "/dashboard/client/documentation", label: "Documentation", icon: "📚" },
];

export default function ClientDashboard() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const [demande, setDemande] = useState<Demande | null>(null);
  const [docsCount, setDocsCount] = useState(0);
  const [prochainRdv, setProchainRdv] = useState<RDV | null>(null);
  const [nouveautesCount, setNouveautesCount] = useState(0);

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "client")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role !== "client") return;
    Promise.all([
      fetch("/api/demandes", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/rendez-vous", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/nouveautes", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
    ]).then(([demandes, rdvs, nouveautes]) => {
      const d = demandes[0] ?? null;
      setDemande(d);
      const aVenir = rdvs.filter(
        (r: { statut: string }) => r.statut === "confirme" || r.statut === "demande"
      );
      setProchainRdv(aVenir[0] ?? null);
      setNouveautesCount(nouveautes?.length ?? 0);
      if (d?.id) {
        fetch(`/api/documents?demandeId=${d.id}`, { credentials: "include" })
          .then((res) => (res.ok ? res.json() : []))
          .then((docs: unknown[]) => setDocsCount(docs.length))
          .catch(() => setDocsCount(0));
      } else {
        setDocsCount(0);
      }
    });
  }, [role]);

  if (!isAuthenticated || role !== "client") return null;

  const dateRdv = prochainRdv?.date_proposee
    ? new Date(prochainRdv.date_proposee).toLocaleString("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  const canBookRdv = demande && docsCount > 0;
  const rdvUrl = canBookRdv
    ? `/dashboard/client/rendez-vous?demande=${demande.id}&motif=Discussion%20statut%20dossier%20cr%C3%A9dit&fromDocs=1`
    : "/dashboard/client/rendez-vous";

  const step1Done = !!demande;
  const step2Done = docsCount > 0;
  const step3Done = !!prochainRdv;

  return (
    <DashboardLayout role="client" title="Mon espace">
      {/* Welcome */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vue d&apos;ensemble</h1>
          <p className="mt-1 text-slate-600 text-sm">
            Suivez votre dossier crédit, vos documents et vos rendez-vous en un coup d&apos;œil.
          </p>
        </div>
      </div>

      {/* Progress */}
      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Avancement de votre dossier</h2>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                step1Done ? "bg-primary-600 text-white" : "bg-slate-200 text-slate-500"
              }`}
            >
              {step1Done ? "✓" : "1"}
            </span>
            <span className="text-sm font-medium text-slate-700">Demande déposée</span>
          </div>
          <div className="h-0.5 flex-1 min-w-4 bg-slate-200" />
          <div className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                step2Done ? "bg-primary-600 text-white" : "bg-slate-200 text-slate-500"
              }`}
            >
              {step2Done ? "✓" : "2"}
            </span>
            <span className="text-sm font-medium text-slate-700">Documents</span>
          </div>
          <div className="h-0.5 flex-1 min-w-4 bg-slate-200" />
          <div className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                step3Done ? "bg-primary-600 text-white" : "bg-slate-200 text-slate-500"
              }`}
            >
              {step3Done ? "✓" : "3"}
            </span>
            <span className="text-sm font-medium text-slate-700">Rendez-vous</span>
          </div>
        </div>
      </section>

      {/* Main demande card */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Ma demande de crédit</h2>
        {demande ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
            <div className="h-1 bg-gradient-to-r from-primary-400 to-primary-600" />
            <div className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        statutBadgeClass[demande.statut] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {DEMANDE_STATUTS[demande.statut] ?? demande.statut}
                    </span>
                  </div>
                  <p className="mt-2 text-xl font-semibold text-slate-800">
                    {demande.type_nom || demande.type_credit?.nom || "Crédit"} · {demande.montant}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Durée {demande.duree} · Déposé le{" "}
                    {new Date(demande.created_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}
                  </p>
                </div>
                <Link
                  href="/dashboard/client/demande"
                  className="shrink-0 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-medium text-primary-700 hover:bg-primary-100 transition"
                >
                  Voir le détail
                </Link>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-5">
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">{docsCount}</span> document(s)
                  déposé(s)
                </span>
                {canBookRdv && (
                  <Link
                    href={rdvUrl}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition"
                  >
                    Réserver un rendez-vous
                  </Link>
                )}
                {demande && docsCount === 0 && (
                  <Link
                    href="/dashboard/client/documents"
                    className="text-sm font-medium text-primary-600 hover:underline"
                  >
                    Déposer vos documents →
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          <Link href="/dashboard/client/demande" className="block">
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center transition hover:border-primary-200 hover:bg-primary-50/30">
              <p className="text-slate-500 text-sm">Aucune demande en cours</p>
              <p className="mt-2 font-medium text-primary-600">Déposer une demande de crédit →</p>
            </div>
          </Link>
        )}
      </section>

      {/* Stats grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/dashboard/client/demande"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-card transition hover:border-primary-200 hover:shadow-cardHover"
        >
          <span className="text-2xl">📋</span>
          <p className="mt-2 text-sm font-medium text-slate-500">Ma demande</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-800">
            {demande ? DEMANDE_STATUTS[demande.statut] ?? demande.statut : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {demande ? `${demande.montant} · ${demande.duree}` : "Déposez une demande"}
          </p>
        </Link>
        <Link
          href="/dashboard/client/documents"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-card transition hover:border-primary-200 hover:shadow-cardHover"
        >
          <span className="text-2xl">📁</span>
          <p className="mt-2 text-sm font-medium text-slate-500">Documents</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-800">{docsCount} déposé(s)</p>
          <p className="mt-1 text-xs text-slate-500">
            {demande ? "Justificatifs pour votre dossier" : "Après une demande"}
          </p>
        </Link>
        <Link
          href="/dashboard/client/rendez-vous"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-card transition hover:border-primary-200 hover:shadow-cardHover"
        >
          <span className="text-2xl">📅</span>
          <p className="mt-2 text-sm font-medium text-slate-500">Rendez-vous</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-800">
            {prochainRdv ? (dateRdv ?? "Demandé") : "Aucun"}
          </p>
          <p className="mt-1 text-xs text-slate-500 truncate">
            {prochainRdv?.motif || "Échanger avec votre conseiller"}
          </p>
        </Link>
        <Link
          href="/dashboard/client/nouveautes"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-card transition hover:border-primary-200 hover:shadow-cardHover"
        >
          <span className="text-2xl">🔔</span>
          <p className="mt-2 text-sm font-medium text-slate-500">Nouveautés</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-800">
            {nouveautesCount > 0 ? `${nouveautesCount} nouvelle(s)` : "Aucune"}
          </p>
          <p className="mt-1 text-xs text-slate-500">Mises à jour de votre dossier</p>
        </Link>
      </div>

      {/* Next steps */}
      {(canBookRdv || nouveautesCount > 0) && (
        <section className="mb-8 rounded-xl border border-primary-200 bg-primary-50/50 p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Prochaines étapes</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            {canBookRdv && (
              <li className="flex items-center gap-2">
                <span className="text-primary-600">✓</span>
                <Link href={rdvUrl} className="font-medium text-primary-700 hover:underline">
                  Réservez un rendez-vous pour discuter du statut de votre demande
                </Link>
              </li>
            )}
            {nouveautesCount > 0 && (
              <li className="flex items-center gap-2">
                <span className="text-primary-600">•</span>
                <Link
                  href="/dashboard/client/nouveautes"
                  className="font-medium text-primary-700 hover:underline"
                >
                  Consulter {nouveautesCount} nouveauté(s) sur votre dossier
                </Link>
              </li>
            )}
          </ul>
        </section>
      )}

      {/* Quick links */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 className="text-base font-semibold text-slate-800 mb-2">Accès rapide</h2>
        <p className="text-slate-600 text-sm mb-4">
          Accédez à toutes les sections de votre espace client.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-primary-200 hover:bg-primary-50/50"
            >
              <span className="text-lg">{icon}</span>
              {label}
            </Link>
          ))}
        </div>
      </section>
    </DashboardLayout>
  );
}
