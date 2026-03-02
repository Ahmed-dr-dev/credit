"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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

type CompteBancaire = {
  id: string;
  client_id: string;
  numero_compte: string;
  iban: string | null;
  banque: string;
  date_ouverture: string;
  created_at: string;
  client: { prenom: string; nom: string; email: string } | null;
};

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none";

export default function AdminComptesBancaires() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId") ?? "";
  const [clients, setClients] = useState<Client[]>([]);
  const [comptes, setComptes] = useState<CompteBancaire[]>([]);
  const [form, setForm] = useState({
    client_id: "",
    numero_compte: "",
    iban: "",
    banque: "",
    date_ouverture: new Date().toISOString().slice(0, 10),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preselectedApplied = useRef(false);

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "admin")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role !== "admin") return;
    Promise.all([
      fetch("/api/profiles?role=client", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/comptes-bancaires", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
    ]).then(([c, cb]) => {
      setClients(Array.isArray(c) ? c : []);
      setComptes(Array.isArray(cb) ? cb : []);
    });
  }, [role]);

  useEffect(() => {
    if (preselectedClientId && clients.length > 0 && !preselectedApplied.current) {
      preselectedApplied.current = true;
      setForm((f) => ({ ...f, client_id: preselectedClientId }));
    }
  }, [preselectedClientId, clients.length]);

  const clientsSansCompte = useMemo(
    () => clients.filter((c) => !c.compte_bancaire_actif),
    [clients]
  );
  const clientIdsAvecCompte = useMemo(() => new Set(comptes.map((cb) => cb.client_id)), [comptes]);
  const clientsEnAttente = useMemo(
    () => clientsSansCompte.filter((c) => !clientIdsAvecCompte.has(c.id)),
    [clientsSansCompte, clientIdsAvecCompte]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.client_id || !form.numero_compte.trim() || !form.banque.trim()) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/comptes-bancaires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          client_id: form.client_id,
          numero_compte: form.numero_compte.trim(),
          iban: form.iban.trim() || undefined,
          banque: form.banque.trim(),
          date_ouverture: form.date_ouverture || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Erreur lors de la création");
        return;
      }
      setComptes((prev) => [data, ...prev]);
      setClients((prev) => prev.map((c) => (c.id === form.client_id ? { ...c, compte_bancaire_actif: true } : c)));
      setForm({
        client_id: "",
        numero_compte: "",
        iban: "",
        banque: "",
        date_ouverture: new Date().toISOString().slice(0, 10),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated || role !== "admin") return null;

  const clientName = (c: Client) => `${c.prenom} ${c.nom}`.trim() || "—";

  return (
    <DashboardLayout role="admin" title="Comptes bancaires">
      <p className="text-slate-600 text-sm mb-6">
        Créez un compte bancaire en agence pour un client (numéro de compte, IBAN, banque). Une fois créé, le client pourra déposer des demandes de crédit.
      </p>

      <div className="space-y-8">
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Créer un compte bancaire</h2>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
              <select
                value={form.client_id}
                onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                className={inputClass}
                required
              >
                <option value="">— Sélectionner un client —</option>
                {clientsEnAttente.map((c) => (
                  <option key={c.id} value={c.id}>
                    {clientName(c)} — {c.email}
                  </option>
                ))}
                {clientsEnAttente.length === 0 && (
                  <option value="" disabled>Aucun client en attente de compte bancaire</option>
                )}
              </select>
              <p className="text-xs text-slate-500 mt-1">Uniquement les clients sans compte bancaire enregistré.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Numéro de compte *</label>
              <input
                type="text"
                value={form.numero_compte}
                onChange={(e) => setForm((f) => ({ ...f, numero_compte: e.target.value }))}
                placeholder="ex. 12345678901"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">IBAN</label>
              <input
                type="text"
                value={form.iban}
                onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))}
                placeholder="ex. FR76 1234 5678 9012 3456 7890 123"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Banque *</label>
              <input
                type="text"
                value={form.banque}
                onChange={(e) => setForm((f) => ({ ...f, banque: e.target.value }))}
                placeholder="ex. BNP Paribas"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date d&apos;ouverture</label>
              <input
                type="date"
                value={form.date_ouverture}
                onChange={(e) => setForm((f) => ({ ...f, date_ouverture: e.target.value }))}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !form.client_id || !form.numero_compte.trim() || !form.banque.trim()}
              className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 transition"
            >
              {submitting ? "Création…" : "Créer le compte bancaire"}
            </button>
          </form>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Clients en attente de compte bancaire</h2>
          {clientsEnAttente.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucun client en attente. Tous les clients ont un compte bancaire enregistré ou aucun client inscrit.</p>
          ) : (
            <ul className="space-y-2">
              {clientsEnAttente.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span>{clientName(c)} — {c.email}</span>
                  <a
                    href={`/dashboard/admin/comptes-bancaires?clientId=${c.id}`}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    Créer le compte bancaire
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Comptes bancaires créés</h2>
          {comptes.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucun compte bancaire enregistré.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="pb-3 pr-4 font-medium">Client</th>
                    <th className="pb-3 pr-4 font-medium">Numéro de compte</th>
                    <th className="pb-3 pr-4 font-medium">IBAN</th>
                    <th className="pb-3 pr-4 font-medium">Banque</th>
                    <th className="pb-3 font-medium">Date ouverture</th>
                  </tr>
                </thead>
                <tbody>
                  {comptes.map((cb) => (
                    <tr key={cb.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4">
                        {cb.client ? `${cb.client.prenom} ${cb.client.nom}` : "—"}
                        <br />
                        <span className="text-xs text-slate-500">{cb.client?.email ?? ""}</span>
                      </td>
                      <td className="py-3 pr-4 font-mono">{cb.numero_compte}</td>
                      <td className="py-3 pr-4 font-mono text-slate-600">{cb.iban || "—"}</td>
                      <td className="py-3 pr-4">{cb.banque}</td>
                      <td className="py-3">{cb.date_ouverture ? new Date(cb.date_ouverture).toLocaleDateString("fr-FR") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}