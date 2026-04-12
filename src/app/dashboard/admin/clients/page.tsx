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
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "actif" | "attente">("all");
  const [form, setForm] = useState({ prenom: "", nom: "", email: "", telephone: "", password: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

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

  // Auto-apply pending filter from URL
  useEffect(() => {
    if (pendingOnly) setFilterStatus("attente");
  }, [pendingOnly]);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      const matchSearch =
        !q ||
        `${c.prenom} ${c.nom}`.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.telephone ?? "").toLowerCase().includes(q);
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "actif" && c.compte_bancaire_actif) ||
        (filterStatus === "attente" && !c.compte_bancaire_actif);
      return matchSearch && matchStatus;
    });
  }, [clients, search, filterStatus]);

  const resetForm = () => {
    setForm({ prenom: "", nom: "", email: "", telephone: "", password: "" });
    setEditingId(null);
    setShowForm(false);
  };

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
        resetForm();
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
        setClients((prev) => [data, ...prev]);
        resetForm();
      }
    }
  };

  const startEdit = (c: Client) => {
    setEditingId(c.id);
    setForm({ prenom: c.prenom, nom: c.nom, email: c.email, telephone: c.telephone || "", password: "" });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id: string) => {
    const r = await fetch(`/api/profiles/${id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) {
      setClients((prev) => prev.filter((c) => c.id !== id));
      setConfirmDelete(null);
      if (editingId === id) resetForm();
    }
  };

  if (!isAuthenticated || role !== "admin") return null;

  return (
    <DashboardLayout role="admin" title="Gestion des comptes clients">
      <p className="text-slate-600 text-sm mb-6">
        Consultez, ajoutez, modifiez et supprimez les comptes clients. Créez le compte bancaire en agence pour les clients en attente.
      </p>

      <div className="space-y-6">

        {/* ── LIST first ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h3 className="text-base font-semibold text-slate-800">
              Liste des clients
              <span className="ml-2 text-sm font-normal text-slate-400">({filteredClients.length} / {clients.length})</span>
            </h3>
            <button
              type="button"
              onClick={() => { resetForm(); setShowForm((v) => !v); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition shadow-soft"
            >
              <span className="text-lg leading-none">+</span> Ajouter un client
            </button>
          </div>

          {/* Search + filters */}
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom, email, téléphone…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none text-sm"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
              )}
            </div>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm font-medium">
              {(["all", "actif", "attente"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterStatus(s)}
                  className={`px-4 py-2.5 transition ${
                    filterStatus === s
                      ? "bg-primary-600 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {s === "all" ? "Tous" : s === "actif" ? "Actifs" : "En attente"}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500 text-xs uppercase tracking-wide">
                  <th className="pb-3 pr-4 font-medium">Nom</th>
                  <th className="pb-3 pr-4 font-medium">Email</th>
                  <th className="pb-3 pr-4 font-medium hidden sm:table-cell">Téléphone</th>
                  <th className="pb-3 pr-4 font-medium">Compte bancaire</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((c) => (
                  <tr key={c.id} className={`border-b border-slate-100 hover:bg-slate-50 transition ${editingId === c.id ? "bg-primary-50/40" : ""}`}>
                    <td className="py-3 pr-4 font-medium text-slate-800">
                      {c.prenom} {c.nom}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{c.email}</td>
                    <td className="py-3 pr-4 text-slate-600 hidden sm:table-cell">{c.telephone || "—"}</td>
                    <td className="py-3 pr-4">
                      {c.compte_bancaire_actif ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          ✓ Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                          ⏳ En attente
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      {!c.compte_bancaire_actif && (
                        <a
                          href={`/dashboard/admin/comptes-bancaires?clientId=${c.id}`}
                          className="mr-2 inline-block px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-medium hover:bg-amber-200 transition"
                        >
                          🏦 Créer compte
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        className="mr-2 px-2.5 py-1 rounded-lg text-xs font-medium text-primary-600 hover:bg-primary-50 transition"
                      >
                        Modifier
                      </button>
                      {confirmDelete === c.id ? (
                        <>
                          <button type="button" onClick={() => remove(c.id)} className="text-red-600 text-xs hover:underline mr-1">Confirmer</button>
                          <button type="button" onClick={() => setConfirmDelete(null)} className="text-slate-500 text-xs hover:underline">Annuler</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setConfirmDelete(c.id)} className="px-2.5 py-1 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition">
                          Supprimer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredClients.length === 0 && (
            <div className="py-10 text-center text-slate-400 text-sm">
              {search
                ? `Aucun résultat pour « ${search} »`
                : filterStatus === "attente"
                ? "Aucun client en attente de compte bancaire."
                : "Aucun client enregistré."}
            </div>
          )}
        </section>

        {/* ── ADD/EDIT form (collapsible) ── */}
        {showForm && (
          <section className="bg-white rounded-xl border border-primary-200 p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-800">
                {editingId ? "✏️ Modifier le client" : "➕ Ajouter un client"}
              </h3>
              <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prénom *</label>
                <input type="text" value={form.prenom} onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))} className={inputClass} required placeholder="Mohamed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
                <input type="text" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} className={inputClass} required placeholder="Ben Ali" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} required disabled={!!editingId} placeholder="email@exemple.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                <input type="tel" value={form.telephone} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} className={inputClass} placeholder="+216 20 123 456" />
              </div>
              {!editingId && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe *</label>
                  <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className={inputClass} placeholder="Min. 8 caractères" required />
                </div>
              )}
              <div className="sm:col-span-2 flex gap-2">
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition shadow-soft">
                  {editingId ? "Enregistrer les modifications" : "Ajouter le client"}
                </button>
                <button type="button" onClick={resetForm} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
                  Annuler
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
