"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import NotificationBell from "@/components/NotificationBell";

type NavItem = { href: string; label: string };

const adminNav: NavItem[] = [
  { href: "/dashboard/admin", label: "Tableau de bord" },
  { href: "/dashboard/admin/clients", label: "Comptes clients" },
  { href: "/dashboard/admin/comptes-bancaires", label: "Comptes bancaires" },
  { href: "/dashboard/admin/agents", label: "Comptes responsables" },
  { href: "/dashboard/admin/demandes", label: "Demandes & affectation" },
  { href: "/dashboard/admin/statistiques", label: "Statistiques" },
  { href: "/dashboard/admin/reclamations", label: "Réclamations" },
  { href: "/dashboard/admin/types-credit", label: "Types de crédit" },
  { href: "/dashboard/admin/assistant", label: "Assistant Q&A" },
];

const agentNav: NavItem[] = [
  { href: "/dashboard/agent", label: "Tableau de bord" },
  { href: "/dashboard/agent/demandes", label: "Consultation des demandes" },
  { href: "/dashboard/agent/dossiers", label: "Analyse des dossiers" },
  { href: "/dashboard/agent/rendez-vous", label: "Gestion des rendez-vous" },
  { href: "/dashboard/agent/rapports", label: "Exporter / Rapports" },
];

const clientNav: NavItem[] = [
  { href: "/dashboard/client", label: "Tableau de bord" },
  { href: "/dashboard/client/compte-bancaire", label: "Mon compte bancaire" },
  { href: "/dashboard/client/demande", label: "Ma demande" },
  { href: "/dashboard/client/demande/nouvelle", label: "↳ Nouvelle demande" },
  { href: "/dashboard/client/demande/suivi", label: "↳ Suivi demande" },
  { href: "/dashboard/client/rendez-vous", label: "Rendez-vous" },
  { href: "/dashboard/client/documents", label: "Documents" },
  { href: "/dashboard/client/reclamations", label: "Réclamations" },
  { href: "/dashboard/client/nouveautes", label: "Nouveautés" },
  { href: "/dashboard/client/documentation", label: "Documentation" },
  { href: "/dashboard/client/profil", label: "Mon profil" },
];

export default function DashboardLayout({
  children,
  role,
  title,
}: {
  children: React.ReactNode;
  role: "admin" | "agent" | "client";
  title: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { email, signOut } = useAuth();
  const nav = role === "admin" ? adminNav : role === "agent" ? agentNav : clientNav;

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const initials = (email ?? "?")
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  const profileHref =
    role === "admin" ? "/dashboard/admin"
    : role === "agent" ? "/dashboard/agent"
    : "/dashboard/client/profil";

  return (
    <div className="min-h-screen flex bg-slate-50/80">
      <aside className="w-60 bg-white border-r border-slate-200/80 flex flex-col shadow-card">
        <div className="p-5 border-b border-slate-100 bg-gradient-to-br from-primary-50/80 to-white">
          <Link href="/" className="font-bold text-primary-700 text-lg tracking-tight">
            Crédit Bancaire
          </Link>
          <p className="text-xs text-slate-500 mt-2 truncate px-1" title={email ?? undefined}>
            {email}
          </p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                pathname === item.href
                  ? "bg-primary-100 text-primary-800 shadow-soft"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 text-left transition flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="bg-white/80 backdrop-blur border-b border-slate-200/80 px-8 py-4 shadow-soft flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-800">{title}</h1>

          <div className="flex items-center gap-3">
            <NotificationBell />

            {/* Logout button */}
            <button
              onClick={handleSignOut}
              title="Déconnexion"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
              </svg>
              <span className="hidden sm:inline">Déconnexion</span>
            </button>

            {/* Avatar / profile link */}
            <Link
              href={profileHref}
              title="Mon profil"
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center text-white text-sm font-bold hover:opacity-90 transition shadow-soft shrink-0"
            >
              {initials}
            </Link>
          </div>
        </header>

        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
