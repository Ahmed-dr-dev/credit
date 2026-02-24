"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

type TypeCredit = {
  id: string;
  nom: string;
  description: string | null;
  duree_max: string | null;
  montant_max: string | null;
};

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none";

export default function AdminTypesCredit() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const [types, setTypes] = useState<TypeCredit[]>([]);
  const [form, setForm] = useState({ nom: "", description: "", dureeMax: "", montantMax: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "admin")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  const load = () =>
    fetch("/api/types-credit", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setTypes)
      .catch(() => {});

  useEffect(() => {
    if (role === "admin") load();
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim()) return;
    const body = { nom: form.nom, description: form.description, duree_max: form.dureeMax, montant_max: form.montantMax };
    if (editingId) {
      const r = await fetch(`/api/types-credit/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const data = await r.json();
        setTypes((prev) => prev.map((t) => (t.id === editingId ? data : t)));
        setEditingId(null);
        setForm({ nom: "", description: "", dureeMax: "", montantMax: "" });
      }
    } else {
      const r = await fetch("/api/types-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const data = await r.json();
        setTypes((prev) => [...prev, data]);
        setForm({ nom: "", description: "", dureeMax: "", montantMax: "" });
      }
    }
  };

  const remove = async (id: string) => {
    const r = await fetch(`/api/types-credit/${id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) {
      setTypes((prev) => prev.filter((t) => t.id !== id));
      setConfirmDelete(null);
      if (editingId === id) {
        setEditingId(null);
        setForm({ nom: "", description: "", dureeMax: "", montantMax: "" });
      }
    }
  };

  if (!isAuthenticated || role !== "admin") return null;

  return (
    <DashboardLayout role="admin" title="Types de crédit">
      <p className="text-slate-600 text-sm mb-6">Paramétrage des types de crédit proposés : ajouter, modifier, supprimer.</p>
      <div className="space-y-8">
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h3 className="text-base font-semibold text-slate-800 mb-4">
            {editingId ? "Modifier le type" : "Ajouter un type de crédit"}
          </h3>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
              <input type="text" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} className={inputClass} required />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Durée max</label>
              <input type="text" value={form.dureeMax} onChange={(e) => setForm((f) => ({ ...f, dureeMax: e.target.value }))} className={inputClass} placeholder="ex. 84 mois" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Montant max</label>
              <input type="text" value={form.montantMax} onChange={(e) => setForm((f) => ({ ...f, montantMax: e.target.value }))} className={inputClass} placeholder="ex. Selon profil" />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" className="px-4 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700">{editingId ? "Enregistrer" : "Ajouter"}</button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setForm({ nom: "", description: "", dureeMax: "", montantMax: "" }); }} className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50">Annuler</button>
              )}
            </div>
          </form>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Liste des types de crédit</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="pb-3 pr-4 font-medium">Nom</th>
                  <th className="pb-3 pr-4 font-medium">Description</th>
                  <th className="pb-3 pr-4 font-medium">Durée max</th>
                  <th className="pb-3 pr-4 font-medium">Montant max</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {types.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium">{t.nom}</td>
                    <td className="py-3 pr-4 text-slate-600">{t.description || "—"}</td>
                    <td className="py-3 pr-4">{t.duree_max || "—"}</td>
                    <td className="py-3 pr-4">{t.montant_max || "—"}</td>
                    <td className="py-3 text-right">
                      <button type="button" onClick={() => { setEditingId(t.id); setForm({ nom: t.nom, description: t.description || "", dureeMax: t.duree_max || "", montantMax: t.montant_max || "" }); }} className="text-primary-600 hover:underline mr-3">Modifier</button>
                      {confirmDelete === t.id ? (
                        <>
                          <button type="button" onClick={() => remove(t.id)} className="text-red-600 hover:underline mr-2">Confirmer</button>
                          <button type="button" onClick={() => setConfirmDelete(null)} className="text-slate-500 hover:underline">Annuler</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setConfirmDelete(t.id)} className="text-red-600 hover:underline">Supprimer</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {types.length === 0 && <p className="text-slate-500 text-sm py-6 text-center">Aucun type de crédit.</p>}
        </section>
      </div>
    </DashboardLayout>
  );
}
