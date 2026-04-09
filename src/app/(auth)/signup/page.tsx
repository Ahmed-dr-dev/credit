"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import PublicNav from "@/components/PublicNav";

const MIN_PASSWORD_LENGTH = 8;
const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none transition";

function passwordChecks(pwd: string) {
  return {
    length: pwd.length >= MIN_PASSWORD_LENGTH,
    letter: /[a-zA-Z]/.test(pwd),
    number: /\d/.test(pwd),
  };
}

export default function SignUpPage() {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [touchedConfirm, setTouchedConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { refreshSession } = useAuth();
  const router = useRouter();

  const checks = passwordChecks(password);
  const passwordValid = checks.length && checks.letter && checks.number;
  const confirmMatch = password === confirm;
  const canSubmit =
    prenom.trim() &&
    nom.trim() &&
    email.trim() &&
    passwordValid &&
    confirmMatch &&
    acceptTerms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prenom: prenom.trim(),
          nom: nom.trim(),
          email: email.trim(),
          telephone: telephone.trim() || undefined,
          password,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Erreur inscription");
      await refreshSession();
      router.push("/dashboard/client");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-hero-gradient bg-grid-pattern bg-grid">
      <PublicNav active="signup" />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-soft border border-slate-200/80 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary-400 to-primary-600" />
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-xl font-semibold text-slate-800">Inscription client</h1>
            <p className="mt-1 text-slate-500 text-sm">
              Réservé aux clients. Les comptes administration et responsables sont gérés par
              l&apos;administration.
            </p>
          </div>

          {error && <p className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-1">
                Identité
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Prénom</label>
                  <input
                    type="text"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    required
                    className={inputClass}
                    placeholder="Mohamed"
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom</label>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                    className={inputClass}
                    placeholder="Ben Ali"
                    autoComplete="family-name"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-1">
                Coordonnées
              </h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="mohamed.benali@gmail.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Téléphone</label>
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className={inputClass}
                  placeholder="+216 20 123 456"
                  autoComplete="tel"
                />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-1">
                Mot de passe
              </h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={inputClass}
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                />
                <ul className="mt-2 space-y-1 text-xs text-slate-500">
                  <li className={checks.length ? "text-primary-600" : ""}>
                    {checks.length ? "✓" : "○"} Au moins {MIN_PASSWORD_LENGTH} caractères
                  </li>
                  <li className={checks.letter ? "text-primary-600" : ""}>
                    {checks.letter ? "✓" : "○"} Une lettre
                  </li>
                  <li className={checks.number ? "text-primary-600" : ""}>
                    {checks.number ? "✓" : "○"} Un chiffre
                  </li>
                </ul>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onBlur={() => setTouchedConfirm(true)}
                  required
                  className={`${inputClass} ${
                    touchedConfirm && !confirmMatch ? "border-red-400 focus:ring-red-500/30 focus:border-red-500" : ""
                  }`}
                  autoComplete="new-password"
                />
                {touchedConfirm && !confirmMatch && (
                  <p className="mt-1 text-sm text-red-600">Les mots de passe ne correspondent pas.</p>
                )}
              </div>
            </section>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-600">
                J&apos;accepte les conditions d&apos;utilisation et la politique de confidentialité de
                la plateforme.
              </span>
            </label>

            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="w-full py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Création..." : "Créer mon compte"}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-500 text-sm">
            Déjà un compte ?{" "}
            <Link href="/signin" className="text-primary-600 font-semibold hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
      </main>
    </div>
  );
}
