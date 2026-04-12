"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none transition bg-white";

type Profile = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
  role: string;
  created_at: string;
  compte_bancaire_actif?: boolean;
};

function passwordChecks(pwd: string) {
  return {
    length: pwd.length >= 8,
    letter: /[a-zA-Z]/.test(pwd),
    number: /\d/.test(pwd),
  };
}

type SectionState = { saving: boolean; success: boolean; error: string | null };
const idle: SectionState = { saving: false, success: false, error: null };

export default function ClientProfilPage() {
  const { isAuthenticated, role, loading, id, refreshSession } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [fetching, setFetching] = useState(true);

  // Section 1 — identity
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [identityState, setIdentityState] = useState<SectionState>(idle);

  // Section 2 — contact
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [contactState, setContactState] = useState<SectionState>(idle);

  // Section 3 — password
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [touchedPwd, setTouchedPwd] = useState(false);
  const [pwdState, setPwdState] = useState<SectionState>(idle);

  // Section 4 — delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "client")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (!isAuthenticated || role !== "client") return;
    setFetching(true);
    fetch("/api/profiles/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Profile | null) => {
        if (data) {
          setProfile(data);
          setPrenom(data.prenom ?? "");
          setNom(data.nom ?? "");
          setEmail(data.email ?? "");
          setTelephone(data.telephone ?? "");
        }
      })
      .finally(() => setFetching(false));
  }, [isAuthenticated, role]);

  const patch = async (
    body: Record<string, string>,
    setState: (s: SectionState) => void,
    onSuccess?: (data: Profile) => void
  ) => {
    if (!id) return;
    setState({ saving: true, success: false, error: null });
    try {
      const r = await fetch(`/api/profiles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) {
        setState({ saving: false, success: false, error: data.error || "Erreur lors de la mise à jour" });
        return;
      }
      setProfile((prev) => (prev ? { ...prev, ...data } : data));
      setState({ saving: false, success: true, error: null });
      onSuccess?.(data);
      await refreshSession();
      setTimeout(() => setState(idle), 4000);
    } catch {
      setState({ saving: false, success: false, error: "Erreur réseau" });
    }
  };

  // Submit handlers
  const saveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, string> = {};
    if (prenom.trim()) body.prenom = prenom.trim();
    if (nom.trim())    body.nom    = nom.trim();
    if (!body.prenom && !body.nom) {
      setIdentityState({ saving: false, success: false, error: "Renseignez au moins un champ." });
      return;
    }
    patch(body, setIdentityState);
  };

  const saveContact = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, string> = { telephone };
    if (email.trim()) body.email = email.trim();
    patch(body, setContactState, (data) => setEmail(data.email ?? ""));
  };

  const checks = passwordChecks(password);
  const pwdValid = checks.length && checks.letter && checks.number;
  const pwdMatch = password === confirmPwd;

  const handleDeleteAccount = async () => {
    if (!id) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const r = await fetch(`/api/profiles/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await r.json();
      if (!r.ok) {
        setDeleteError(data.error || "Erreur lors de la suppression");
        setDeleting(false);
        return;
      }
      // Session cleared server-side, redirect home
      router.push("/?deleted=1");
    } catch {
      setDeleteError("Erreur réseau");
      setDeleting(false);
    }
  };

  const savePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    if (!pwdValid) {
      setPwdState({ saving: false, success: false, error: "Le mot de passe ne respecte pas les critères." });
      return;
    }
    if (!pwdMatch) {
      setPwdState({ saving: false, success: false, error: "Les mots de passe ne correspondent pas." });
      return;
    }
    patch({ password }, setPwdState, () => {
      setPassword("");
      setConfirmPwd("");
      setTouchedPwd(false);
    });
  };

  if (!isAuthenticated || role !== "client") return null;

  const initials = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase() || "?";
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("fr-FR", { dateStyle: "long" })
    : "—";

  const Feedback = ({ state }: { state: SectionState }) => (
    <>
      {state.success && (
        <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-2.5 text-sm text-green-800">
          ✅ Modification enregistrée.
        </div>
      )}
      {state.error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-800">
          {state.error}
        </div>
      )}
    </>
  );

  return (
    <DashboardLayout role="client" title="Mon profil">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Avatar card ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center text-white text-3xl font-bold shadow-soft shrink-0 select-none">
            {fetching ? "…" : initials}
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-slate-800 truncate">
              {fetching ? "Chargement…" : `${prenom} ${nom}`}
            </p>
            <p className="text-sm text-slate-500 mt-0.5 truncate">{email || "—"}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-700">Client</span>
              {profile?.compte_bancaire_actif && (
                <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                  Compte bancaire actif
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Membre depuis le {memberSince}</p>
          </div>
        </div>

        {fetching ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-sm animate-pulse shadow-card">
            Chargement de votre profil…
          </div>
        ) : (
          <>
            {/* ── Section 1 : Identité ── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2">
                Identité
              </h2>
              <Feedback state={identityState} />
              <form onSubmit={saveIdentity} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Prénom</label>
                    <input
                      type="text"
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
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
                      className={inputClass}
                      placeholder="Ben Ali"
                      autoComplete="family-name"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={identityState.saving}
                    className="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition shadow-soft disabled:opacity-50"
                  >
                    {identityState.saving ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </div>
              </form>
            </div>

            {/* ── Section 2 : Coordonnées ── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2">
                Coordonnées
              </h2>
              <Feedback state={contactState} />
              <form onSubmit={saveContact} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="vous@exemple.com"
                    autoComplete="email"
                  />
                  {profile?.email && email.trim().toLowerCase() !== profile.email.toLowerCase() && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Vous allez modifier votre adresse email de connexion.
                    </p>
                  )}
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
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={contactState.saving}
                    className="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition shadow-soft disabled:opacity-50"
                  >
                    {contactState.saving ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </div>
              </form>
            </div>

            {/* ── Section 3 : Mot de passe ── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2">
                Changer le mot de passe
              </h2>
              <Feedback state={pwdState} />
              <form onSubmit={savePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    autoComplete="new-password"
                    placeholder="••••••••"
                  />
                  {password && (
                    <ul className="mt-2 space-y-1 text-xs">
                      <li className={checks.length ? "text-emerald-600" : "text-slate-400"}>{checks.length ? "✓" : "○"} Au moins 8 caractères</li>
                      <li className={checks.letter ? "text-emerald-600" : "text-slate-400"}>{checks.letter ? "✓" : "○"} Une lettre</li>
                      <li className={checks.number ? "text-emerald-600" : "text-slate-400"}>{checks.number ? "✓" : "○"} Un chiffre</li>
                    </ul>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    onBlur={() => setTouchedPwd(true)}
                    className={`${inputClass} ${touchedPwd && confirmPwd && !pwdMatch ? "border-red-400 focus:ring-red-500/30" : ""}`}
                    autoComplete="new-password"
                    placeholder="••••••••"
                  />
                  {touchedPwd && confirmPwd && !pwdMatch && (
                    <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas.</p>
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={pwdState.saving || !password.trim()}
                    className="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition shadow-soft disabled:opacity-50"
                  >
                    {pwdState.saving ? "Modification…" : "Changer le mot de passe"}
                  </button>
                </div>
              </form>
            </div>

            {/* ── Section 4 : Supprimer le compte (uniquement si compte en attente) ── */}
            {!profile?.compte_bancaire_actif && (
              <div className="bg-white rounded-2xl border border-red-200 p-6 shadow-card">
                <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-1 border-b border-red-100 pb-2">
                  Zone de danger
                </h2>
                <p className="text-sm text-slate-600 mt-3 mb-4">
                  Votre compte est actuellement <span className="font-semibold text-amber-600">en attente</span> (aucun compte bancaire actif).
                  Vous pouvez supprimer définitivement votre compte. Cette action est <span className="font-semibold">irréversible</span>.
                </p>

                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(true);
                      setTimeout(() => deleteInputRef.current?.focus(), 100);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition"
                  >
                    Supprimer mon compte
                  </button>
                ) : (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-5 space-y-4">
                    <p className="text-sm font-medium text-red-800">
                      Pour confirmer, saisissez votre adresse email&nbsp;:
                      <span className="font-bold"> {profile?.email}</span>
                    </p>
                    <input
                      ref={deleteInputRef}
                      type="email"
                      value={deleteInput}
                      onChange={(e) => { setDeleteInput(e.target.value); setDeleteError(null); }}
                      placeholder={profile?.email ?? "votre@email.com"}
                      className="w-full px-4 py-2.5 rounded-xl border border-red-300 bg-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none transition text-sm"
                    />
                    {deleteError && (
                      <p className="text-xs text-red-700 bg-red-100 rounded-lg px-3 py-2">{deleteError}</p>
                    )}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); setDeleteError(null); }}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        disabled={deleting || deleteInput.trim().toLowerCase() !== profile?.email.toLowerCase()}
                        onClick={handleDeleteAccount}
                        className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {deleting ? "Suppression…" : "Confirmer la suppression"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
