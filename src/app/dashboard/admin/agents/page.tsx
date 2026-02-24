"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

type Agent = { id: string; prenom: string; nom: string; email: string };

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none";

export default function AdminAgents() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [form, setForm] = useState({ prenom: "", nom: "", email: "", password: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "admin")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role !== "admin") return;
    fetch("/api/profiles?role=agent", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setAgents)
      .catch(() => {});
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.prenom.trim() || !form.nom.trim() || !form.email.trim()) return;
    const body = { prenom: form.prenom, nom: form.nom, email: form.email, password: form.password || undefined, role: "agent" };
    if (editingId) {
      const r = await fetch(`/api/profiles/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const data = await r.json();
        setAgents((prev) => prev.map((a) => (a.id === editingId ? { ...a, ...data } : a)));
        setEditingId(null);
        setForm({ prenom: "", nom: "", email: "", password: "" });
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
        setAgents((prev) => [...prev, data]);
        setForm({ prenom: "", nom: "", email: "", password: "" });
      }
    }
  };

  const remove = async (id: string) => {
    const r = await fetch(`/api/profiles/${id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) {
      setAgents((prev) => prev.filter((a) => a.id !== id));
      setConfirmDelete(null);
      if (editingId === id) {
        setEditingId(null);
        setForm({ prenom: "", nom: "", email: "", password: "" });
      }
    }
  };

  if (!isAuthenticated || role !== "admin") return null;

  return (
    <DashboardLayout role="admin" title="Gestion des comptes responsables">
      <p className="text-slate-600 text-sm mb-6">Ajouter, modifier et supprimer les comptes des responsables bancaires (agents de crédit).</p>
      <div className="space-y-8">
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h3 className="text-base font-semibold text-slate-800 mb-4">
            {editingId ? "Modifier le responsable" : "Ajouter un responsable"}
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
            {!editingId && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
                <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className={inputClass} required />
              </div>
            )}
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" className="px-4 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700">{editingId ? "Enregistrer" : "Ajouter"}</button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setForm({ prenom: "", nom: "", email: "", password: "" }); }} className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50">Annuler</button>
              )}
            </div>
          </form>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Liste des responsables</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="pb-3 pr-4 font-medium">Nom</th>
                  <th className="pb-3 pr-4 font-medium">Email</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4">{a.prenom} {a.nom}</td>
                    <td className="py-3 pr-4">{a.email}</td>
                    <td className="py-3 text-right">
                      <button type="button" onClick={() => { setEditingId(a.id); setForm({ prenom: a.prenom, nom: a.nom, email: a.email, password: "" }); }} className="text-primary-600 hover:underline mr-3">Modifier</button>
                      {confirmDelete === a.id ? (
                        <>
                          <button type="button" onClick={() => remove(a.id)} className="text-red-600 hover:underline mr-2">Confirmer</button>
                          <button type="button" onClick={() => setConfirmDelete(null)} className="text-slate-500 hover:underline">Annuler</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setConfirmDelete(a.id)} className="text-red-600 hover:underline">Supprimer</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {agents.length === 0 && <p className="text-slate-500 text-sm py-6 text-center">Aucun responsable.</p>}
        </section>
      </div>
    </DashboardLayout>
  );
}
