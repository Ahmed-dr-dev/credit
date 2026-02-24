"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

type Role = "admin" | "agent" | "client";

function redirectByRole(role: Role) {
  if (role === "admin") return "/dashboard/admin";
  if (role === "agent") return "/dashboard/agent";
  return "/dashboard/client";
}

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password, null);
      const r = await fetch("/api/auth/session", { credentials: "include" });
      const data = await r.json();
      const role = (data.user?.role || "client") as Role;
      router.push(redirectByRole(role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-hero-gradient bg-grid-pattern bg-grid px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-soft border border-slate-200/80 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary-400 to-primary-600" />
        <div className="p-8">
          <div className="text-center mb-8">
            <Link href="/" className="font-bold text-primary-700 text-lg">
              Crédit Bancaire
            </Link>
            <h1 className="mt-5 text-xl font-semibold text-slate-800">Connexion</h1>
            <p className="mt-1 text-slate-500 text-sm">Connectez-vous à votre espace</p>
          </div>

          {error && <p className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none transition"
                placeholder="vous@exemple.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition shadow-soft disabled:opacity-50"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-500 text-sm">
            Pas de compte client ?{" "}
            <Link href="/signup" className="text-primary-600 font-semibold hover:underline">
              S&apos;inscrire
            </Link>
            <span className="block mt-1 text-xs">(Inscription réservée aux clients.)</span>
          </p>
        </div>
      </div>
    </div>
  );
}
