"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none transition bg-white";

type Compte = {
  id: string;
  numero_compte: string;
  iban: string | null;
  banque: string;
  date_ouverture: string;
  created_at: string;
};

export default function ClientCompteBancairePage() {
  const { isAuthenticated, role, loading, refreshSession } = useAuth();
  const router = useRouter();

  const [compte, setCompte] = useState<Compte | null | undefined>(undefined); // undefined = loading
  const [fetching, setFetching] = useState(true);

  const [numeroCmpte, setNumeroCmpte] = useState("");
  const [iban, setIban] = useState("");
  const [banque, setBanque] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "client")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role !== "client") return;
    fetch("/api/comptes-bancaires", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setCompte(data ?? null))
      .catch(() => setCompte(null))
      .finally(() => setFetching(false));
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroCmpte.trim() || !banque.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/comptes-bancaires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          numero_compte: numeroCmpte.trim(),
          iban: iban.trim() || undefined,
          banque: banque.trim(),
        }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || "Erreur lors de l'enregistrement"); return; }
      setCompte(data);
      setSuccess(true);
      await refreshSession();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated || role !== "client") return null;

  return (
    <DashboardLayout role="client" title="Mon compte bancaire">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Info banner */}
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <p className="font-semibold mb-1">📋 Pourquoi renseigner mon compte bancaire ?</p>
          <p className="text-sky-800">
            Votre numéro de compte bancaire est nécessaire pour activer votre espace et déposer une demande de crédit.
            Renseignez le RIB de votre compte existant dans n&apos;importe quelle banque tunisienne.
          </p>
        </div>

        {fetching ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-sm animate-pulse shadow-card">
            Chargement…
          </div>
        ) : compte ? (
          /* ── Already has a bank account ── */
          <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-card space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-xl">🏦</div>
              <div>
                <p className="font-semibold text-slate-800">Compte bancaire enregistré</p>
                <p className="text-xs text-emerald-600 font-medium">✓ Compte actif</p>
              </div>
            </div>
            <div className="grid gap-3">
              {[
                { label: "Banque", val: compte.banque },
                { label: "Numéro de compte", val: compte.numero_compte, mono: true },
                { label: "IBAN", val: compte.iban ?? "Non renseigné", mono: true },
                {
                  label: "Enregistré le",
                  val: new Date(compte.created_at).toLocaleDateString("fr-FR", { dateStyle: "long" }),
                },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-500">{row.label}</span>
                  <span className={`text-sm font-semibold text-slate-800 ${row.mono ? "font-mono" : ""}`}>
                    {row.val}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Pour modifier votre compte bancaire, contactez votre conseiller via la rubrique Rendez-vous ou Réclamations.
            </p>
          </div>
        ) : (
          /* ── Register bank account form ── */
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Enregistrer mon compte bancaire</h2>
            <p className="text-sm text-slate-500 mb-5">
              Saisissez les informations de votre RIB existant. Vous pouvez trouver ces informations sur votre relevé de compte ou dans votre application bancaire.
            </p>

            {success && (
              <div className="mb-5 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
                ✅ Compte bancaire enregistré avec succès. Votre espace est maintenant actif !
              </div>
            )}
            {error && (
              <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Banque *
                </label>
                <input
                  type="text"
                  value={banque}
                  onChange={(e) => setBanque(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="ex. BNA, STB, BIAT, Attijari…"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Numéro de compte *
                </label>
                <input
                  type="text"
                  value={numeroCmpte}
                  onChange={(e) => setNumeroCmpte(e.target.value)}
                  required
                  className={`${inputClass} font-mono`}
                  placeholder="ex. 07304000012345678900"
                  autoComplete="off"
                />
                <p className="text-xs text-slate-400 mt-1">Numéro de compte tel qu&apos;il apparaît sur votre RIB.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  IBAN <span className="text-slate-400 font-normal">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  className={`${inputClass} font-mono`}
                  placeholder="ex. TN59 1400 0000 0123 4567 8900"
                  autoComplete="off"
                />
                <p className="text-xs text-slate-400 mt-1">Format IBAN tunisien (commence par TN).</p>
              </div>

              {/* RIB explanation */}
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-600">💡 Où trouver mon RIB ?</p>
                <p>• Sur un relevé de compte papier ou PDF envoyé par votre banque</p>
                <p>• Dans votre application bancaire mobile (rubrique compte / RIB)</p>
                <p>• En agence auprès de votre conseiller bancaire</p>
              </div>

              <button
                type="submit"
                disabled={submitting || !numeroCmpte.trim() || !banque.trim()}
                className="w-full py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Enregistrement…" : "Enregistrer mon compte bancaire"}
              </button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
