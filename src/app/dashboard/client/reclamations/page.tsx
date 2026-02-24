"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import PageIntro from "@/components/client/PageIntro";
import { RECLAMATION_STATUTS } from "@/lib/statuts";

type Reclamation = {
  id: string;
  sujet: string;
  message: string;
  statut: string;
  created_at: string;
};

export default function ClientReclamations() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const [sujet, setSujet] = useState("");
  const [message, setMessage] = useState("");
  const [liste, setListe] = useState<Reclamation[]>([]);

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "client")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role === "client") {
      fetch("/api/reclamations", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : []))
        .then(setListe)
        .catch(() => {});
    }
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sujet.trim() || !message.trim()) return;
    const r = await fetch("/api/reclamations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ sujet: sujet.trim(), message: message.trim() }),
    });
    if (r.ok) {
      const data = await r.json();
      setListe((prev) => [data, ...prev]);
      setSujet("");
      setMessage("");
    }
  };

  if (!isAuthenticated || role !== "client") return null;

  return (
    <DashboardLayout role="client" title="Réclamations">
      <PageIntro
        title="Réclamations"
        description="Signalez un problème ou une insatisfaction liée à votre dossier."
        icon="📢"
      />
      <div className="max-w-2xl space-y-8">
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h3 className="text-base font-semibold text-slate-800 mb-2">Déposer une réclamation</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sujet</label>
              <input
                type="text"
                value={sujet}
                onChange={(e) => setSujet(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none"
                placeholder="Ex. retard de traitement, document manquant..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none resize-y"
                placeholder="Décrivez votre réclamation..."
              />
            </div>
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition">
              Envoyer la réclamation
            </button>
          </form>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h3 className="text-base font-semibold text-slate-800 mb-2">Historique des réclamations</h3>
          {liste.length === 0 ? (
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-6 text-center">
              <p className="text-slate-500 text-sm">Aucune réclamation pour le moment.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {liste.map((r) => (
                <li key={r.id} className="flex justify-between items-start p-4 rounded-lg bg-slate-50 border border-slate-100">
                  <div>
                    <p className="font-medium text-slate-800">{r.sujet}</p>
                    <p className="text-sm text-slate-600 mt-1">{r.message}</p>
                    <p className="text-xs text-slate-400 mt-2">{new Date(r.created_at).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded">
                    {RECLAMATION_STATUTS[r.statut] ?? r.statut}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
