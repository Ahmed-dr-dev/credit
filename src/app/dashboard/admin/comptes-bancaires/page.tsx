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
  const [form, setForm] = useState({ client_id: "", banque: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CompteBancaire | null>(null);
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
    setCreated(null);
    if (!form.client_id || !form.banque.trim()) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/comptes-bancaires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ client_id: form.client_id, banque: form.banque.trim() }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || "Erreur lors de la création"); return; }
      setComptes((prev) => [data, ...prev]);
      setClients((prev) => prev.map((c) => (c.id === form.client_id ? { ...c, compte_bancaire_actif: true } : c)));
      setCreated(data);
      setForm({ client_id: "", banque: "" });
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
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Créer un compte bancaire</h2>
          <p className="text-xs text-slate-500 mb-5">
            Le numéro de compte, l&apos;IBAN et la date d&apos;ouverture sont générés automatiquement par le système.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</div>
          )}

          {/* Created confirmation card */}
          {created && (
            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5">
              <p className="text-sm font-bold text-green-800 mb-3">✅ Compte créé avec succès</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { label: "Client", val: created.client ? `${created.client.prenom} ${created.client.nom}` : "—" },
                  { label: "Banque", val: created.banque },
                  { label: "N° de compte", val: created.numero_compte },
                  { label: "IBAN", val: created.iban ?? "—" },
                  { label: "Date d'ouverture", val: new Date(created.date_ouverture).toLocaleDateString("fr-FR", { dateStyle: "long" }) },
                ].map((row) => (
                  <div key={row.label} className="bg-white rounded-lg border border-green-100 px-4 py-2.5">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{row.label}</p>
                    <p className="font-semibold text-slate-800 text-sm font-mono mt-0.5 break-all">{row.val}</p>
                  </div>
                ))}
              </div>
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
                  <option key={c.id} value={c.id}>{clientName(c)} — {c.email}</option>
                ))}
                {clientsEnAttente.length === 0 && (
                  <option value="" disabled>Aucun client en attente de compte bancaire</option>
                )}
              </select>
              <p className="text-xs text-slate-500 mt-1">Uniquement les clients sans compte bancaire enregistré.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Banque *</label>
              <input
                type="text"
                value={form.banque}
                onChange={(e) => setForm((f) => ({ ...f, banque: e.target.value }))}
                placeholder="ex. BNA Bank"
                className={inputClass}
                required
              />
            </div>

            {/* Auto-generated fields preview */}
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Générés automatiquement</p>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">N° de compte</span>
                <span className="font-mono text-slate-400 italic">BNA00000XXX</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">IBAN</span>
                <span className="font-mono text-slate-400 italic">TN59 XXXX XXXX XXXX XXXX XXXX</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Date d&apos;ouverture</span>
                <span className="font-mono text-slate-400 italic">
                  {new Date().toLocaleDateString("fr-FR", { dateStyle: "long" })} (aujourd&apos;hui)
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !form.client_id || !form.banque.trim()}
              className="w-full py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50 transition shadow-soft"
            >
              {submitting ? "Création en cours…" : "Créer le compte bancaire"}
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