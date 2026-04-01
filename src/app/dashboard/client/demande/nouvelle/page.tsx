"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

type TypeCredit = { id: string; nom: string };

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none transition";

export default function NouvelleDemande() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const [types, setTypes] = useState<TypeCredit[]>([]);
  const [compteBancaireActif, setCompteBancaireActif] = useState<boolean | null>(null);
  const [form, setForm] = useState({ type_credit_id: "", type_nom: "", montant: "", duree: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [hasActive, setHasActive] = useState(false);

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "client")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role !== "client") return;
    Promise.all([
      fetch("/api/me", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/types-credit", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/demandes", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
    ]).then(([me, t, demandes]) => {
      setCompteBancaireActif(me?.compte_bancaire_actif ?? null);
      setTypes(t);
      const active = (demandes as { statut: string }[]).some((d) => d.statut !== "refusee");
      setHasActive(active);
    });
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.montant.trim() || !form.duree) return;
    setSubmitting(true);
    setError("");
    try {
      const r = await fetch("/api/demandes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type_credit_id: form.type_credit_id || null,
          type_nom: form.type_nom || null,
          montant: form.montant.trim(),
          duree: form.duree,
        }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error || "Erreur lors de l'envoi");
      }
      setSuccess(true);
      setForm({ type_credit_id: "", type_nom: "", montant: "", duree: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated || role !== "client") return null;

  const pendingBank = compteBancaireActif === false;
  const blocked = pendingBank || hasActive;

  return (
    <DashboardLayout role="client" title="Nouvelle demande de crédit">
      <div className="max-w-2xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/dashboard/client/demande" className="hover:text-primary-600 transition">Ma demande</Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Nouvelle demande</span>
        </div>

        {/* Blocked: pending bank account */}
        {pendingBank && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <p className="font-semibold">Compte bancaire non activé</p>
            <p className="text-sm mt-1">
              Présentez-vous en agence pour que l&apos;administrateur active votre compte. Vous pourrez ensuite déposer une demande.
            </p>
          </div>
        )}

        {/* Blocked: already has active demand */}
        {!pendingBank && hasActive && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <p className="font-semibold">Demande déjà en cours</p>
            <p className="text-sm mt-1">
              Vous avez déjà une demande active. Une nouvelle demande ne peut être soumise qu&apos;après la clôture du dossier en cours.
            </p>
            <Link
              href="/dashboard/client/demande/suivi"
              className="mt-3 inline-flex px-4 py-2 rounded-lg bg-amber-700 text-white text-sm font-medium hover:bg-amber-800 transition"
            >
              Voir le suivi →
            </Link>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
            <p className="font-semibold">Demande soumise avec succès !</p>
            <p className="text-sm mt-1">Votre dossier est en cours de traitement. Déposez vos documents pour accélérer l&apos;étude.</p>
            <div className="flex gap-3 mt-3">
              <Link href="/dashboard/client/documents" className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition">
                Déposer des documents →
              </Link>
              <Link href="/dashboard/client/demande/suivi" className="px-4 py-2 rounded-lg border border-green-300 text-green-800 text-sm font-medium hover:bg-green-100 transition">
                Voir le suivi →
              </Link>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {/* Form */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-xl">📋</span>
            <div>
              <h2 className="font-semibold text-slate-800">Formulaire de demande</h2>
              <p className="text-xs text-slate-500 mt-0.5">Renseignez le type, le montant et la date de fin souhaitée.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Type de crédit</label>
              <select
                value={form.type_credit_id}
                disabled={blocked}
                onChange={(e) => {
                  const opt = e.target.options[e.target.selectedIndex];
                  setForm((f) => ({ ...f, type_credit_id: e.target.value, type_nom: opt?.text ?? "" }));
                }}
                className={inputClass}
              >
                <option value="">— Sélectionner —</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>{t.nom}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Montant souhaité (TND)</label>
              <input
                type="text"
                value={form.montant}
                disabled={blocked}
                onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))}
                placeholder="ex. 25 000"
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Date de fin souhaitée</label>
              <input
                type="date"
                value={form.duree}
                disabled={blocked}
                min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                onChange={(e) => setForm((f) => ({ ...f, duree: e.target.value }))}
                className={inputClass}
                required
              />
              {form.duree && (
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(form.duree).toLocaleDateString("fr-FR", { dateStyle: "long" })}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={blocked || submitting}
              className="w-full py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-soft"
            >
              {submitting ? "Envoi en cours…" : "Soumettre la demande"}
            </button>
          </form>
        </section>

        {/* Info */}
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-500 space-y-1">
          <p>• Après soumission, déposez vos justificatifs dans <Link href="/dashboard/client/documents" className="text-primary-600 hover:underline">Documents</Link>.</p>
          <p>• Votre dossier sera étudié par un responsable crédit désigné.</p>
          <p>• Vous pouvez réserver un <Link href="/dashboard/client/rendez-vous" className="text-primary-600 hover:underline">rendez-vous</Link> pour suivre l&apos;avancement.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
