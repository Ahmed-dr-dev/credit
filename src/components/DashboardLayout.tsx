"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

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
  { href: "/dashboard/client/demande", label: "Ma demande" },
  { href: "/dashboard/client/rendez-vous", label: "Rendez-vous" },
  { href: "/dashboard/client/documents", label: "Documents" },
  { href: "/dashboard/client/reclamations", label: "Réclamations" },
  { href: "/dashboard/client/nouveautes", label: "Nouveautés" },
  { href: "/dashboard/client/documentation", label: "Documentation & types de crédit" },
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
        <nav className="flex-1 p-3 space-y-1">
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
            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 text-left transition"
          >
            Déconnexion
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="bg-white/80 backdrop-blur border-b border-slate-200/80 px-8 py-5 shadow-soft">
          <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
