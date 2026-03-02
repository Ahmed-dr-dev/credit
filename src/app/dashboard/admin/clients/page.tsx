"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

type Client = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
  compte_bancaire_actif?: boolean;
};

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none";

export default function AdminClients() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pendingOnly = searchParams.get("pending") === "1";
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState({ prenom: "", nom: "", email: "", telephone: "", password: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filteredClients = useMemo(
    () => (pendingOnly ? clients.filter((c) => !c.compte_bancaire_actif) : clients),
    [clients, pendingOnly]
  );

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "admin")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role !== "admin") return;
    fetch("/api/profiles?role=client", { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then(setClients)
      .catch(() => {});
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.prenom.trim() || !form.nom.trim() || !form.email.trim()) return;
    const body = {
      prenom: form.prenom,
      nom: form.nom,
      email: form.email,
      telephone: form.telephone || undefined,
      password: form.password || undefined,
      role: "client",
    };
    if (editingId) {
      const r = await fetch(`/api/profiles/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const data = await r.json();
        setClients((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...data } : c)));
        setEditingId(null);
        setForm({ prenom: "", nom: "", email: "", telephone: "", password: "" });
      }
    } else {
      const r = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const data = await r.json();
        setClients((prev) => [...prev, data]);
        setForm({ prenom: "", nom: "", email: "", telephone: "", password: "" });
      }
    }
  };

  const remove = async (id: string) => {
    const r = await fetch(`/api/profiles/${id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) {
      setClients((prev) => prev.filter((c) => c.id !== id));
      setConfirmDelete(null);
      if (editingId === id) {
        setEditingId(null);
        setForm({ prenom: "", nom: "", email: "", telephone: "", password: "" });
      }
    }
  };

  if (!isAuthenticated || role !== "admin") return null;

  return (
    <DashboardLayout role="admin" title="Gestion des comptes clients">
      <p className="text-slate-600 text-sm mb-6">
        Ajouter, modifier et supprimer les comptes clients. Les clients inscrits en ligne sont en attente jusqu&apos;à ce que vous créiez leur compte bancaire en agence (bouton « Créer compte bancaire »).
      </p>
      {pendingOnly && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm text-amber-800">
          Filtre : uniquement les comptes <strong>en attente de compte bancaire</strong>. Présentez-vous en agence pour activer.
        </div>
      )}
      <div className="space-y-8">
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h3 className="text-base font-semibold text-slate-800 mb-4">
            {editingId ? "Modifier le client" : "Ajouter un client"}
          </h3>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prénom</label>
              <input type="text" value={form.prenom} onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))} className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
              <input type="text" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} required disabled={!!editingId} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
              <input type="tel" value={form.telephone} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} className={inputClass} />
            </div>
            {!editingId && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
                <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className={inputClass} placeholder="Requis" />
              </div>
            )}
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" className="px-4 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700">{editingId ? "Enregistrer" : "Ajouter"}</button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setForm({ prenom: "", nom: "", email: "", telephone: "", password: "" }); }} className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50">Annuler</button>
              )}
            </div>
          </form>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h3 className="text-base font-semibold text-slate-800">Liste des clients</h3>
            {pendingOnly && (
              <a href="/dashboard/admin/clients" className="text-sm text-primary-600 hover:underline">Voir tous les clients</a>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="pb-3 pr-4 font-medium">Nom</th>
                  <th className="pb-3 pr-4 font-medium">Email</th>
                  <th className="pb-3 pr-4 font-medium">Téléphone</th>
                  <th className="pb-3 pr-4 font-medium">Compte bancaire</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4">{c.prenom} {c.nom}</td>
                    <td className="py-3 pr-4">{c.email}</td>
                    <td className="py-3 pr-4">{c.telephone || "—"}</td>
                    <td className="py-3 pr-4">
                      {c.compte_bancaire_actif ? (
                        <span className="text-green-600 font-medium">Actif</span>
                      ) : (
                        <span className="text-amber-600 font-medium">En attente</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {!c.compte_bancaire_actif && (
                        <a href={`/dashboard/admin/comptes-bancaires?clientId=${c.id}`} className="mr-3 inline-block px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-sm font-medium hover:bg-amber-200">Créer compte bancaire</a>
                      )}
                      <button type="button" onClick={() => { setEditingId(c.id); setForm({ prenom: c.prenom, nom: c.nom, email: c.email, telephone: c.telephone || "", password: "" }); }} className="text-primary-600 hover:underline mr-3">Modifier</button>
                      {confirmDelete === c.id ? (
                        <>
                          <button type="button" onClick={() => remove(c.id)} className="text-red-600 hover:underline mr-2">Confirmer</button>
                          <button type="button" onClick={() => setConfirmDelete(null)} className="text-slate-500 hover:underline">Annuler</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setConfirmDelete(c.id)} className="text-red-600 hover:underline">Supprimer</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredClients.length === 0 && <p className="text-slate-500 text-sm py-6 text-center">{pendingOnly ? "Aucun client en attente de compte bancaire." : "Aucun client."}</p>}
        </section>
      </div>
    </DashboardLayout>
  );
}
