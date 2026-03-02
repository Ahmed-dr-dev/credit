"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import PageIntro from "@/components/client/PageIntro";
import { DEMANDE_STATUTS } from "@/lib/statuts";

type TypeCredit = { id: string; nom: string };
type Demande = {
  id: string;
  montant: string;
  duree: string;
  statut: string;
  type_nom: string | null;
  created_at: string;
  type_credit?: { nom: string } | null;
};

export default function ClientDemande() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const [types, setTypes] = useState<TypeCredit[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [docsCount, setDocsCount] = useState(0);
  const [form, setForm] = useState({ type_credit_id: "", type_nom: "", montant: "", duree: "" });
  const [compteBancaireActif, setCompteBancaireActif] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "client")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role !== "client") return;
    fetch("/api/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => setCompteBancaireActif(p?.compte_bancaire_actif ?? null))
      .catch(() => setCompteBancaireActif(null));
  }, [role]);

  useEffect(() => {
    if (role !== "client") return;
    Promise.all([
      fetch("/api/types-credit", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/demandes", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
    ]).then(([t, d]) => {
      setTypes(t);
      setDemandes(d);
      const dernier = d[0];
      if (dernier?.id) {
        fetch(`/api/documents?demandeId=${dernier.id}`, { credentials: "include" })
          .then((r) => (r.ok ? r.json() : []))
          .then((docs: unknown[]) => setDocsCount(docs.length))
          .catch(() => setDocsCount(0));
      } else {
        setDocsCount(0);
      }
    });
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.montant.trim() || !form.duree.trim()) return;
    const r = await fetch("/api/demandes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        type_credit_id: form.type_credit_id || null,
        type_nom: form.type_nom || null,
        montant: form.montant.trim(),
        duree: form.duree.trim(),
      }),
    });
    if (r.ok) {
      const data = await r.json();
      setDemandes((prev) => [data, ...prev]);
      setForm({ type_credit_id: "", type_nom: "", montant: "", duree: "" });
    }
  };

  if (!isAuthenticated || role !== "client") return null;

  const derniere = demandes[0];
  const canBookRdv = derniere && docsCount > 0;
  const rdvUrl = derniere
    ? `/dashboard/client/rendez-vous?demande=${derniere.id}&motif=Discussion%20statut%20dossier%20cr%C3%A9dit&fromDocs=1`
    : "/dashboard/client/rendez-vous";

  const pendingBank = compteBancaireActif === false;

  return (
    <DashboardLayout role="client" title="Ma demande de crédit">
      {pendingBank && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="font-medium">Compte en attente de compte bancaire</p>
          <p className="text-sm mt-1">Vous devez vous présenter en agence pour que l&apos;administrateur crée votre compte bancaire. Une fois activé, vous pourrez déposer une demande de crédit.</p>
        </div>
      )}
      <PageIntro
        title="Ma demande de crédit"
        description="Déposez une nouvelle demande ou consultez le suivi détaillé de votre demande."
        icon="📋"
      />
      <div className="space-y-8 max-w-2xl">
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h3 className="text-base font-semibold text-slate-800 mb-2">Déposer une demande</h3>
          <p className="text-slate-600 text-sm mb-4">
            {pendingBank ? "Activez d&apos;abord votre compte bancaire en agence pour déposer une demande." : "Renseignez le type, le montant et la durée souhaités."}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type de crédit</label>
              <select
                value={form.type_credit_id}
                onChange={(e) => {
                  const opt = e.target.options[e.target.selectedIndex];
                  setForm((f) => ({
                    ...f,
                    type_credit_id: e.target.value,
                    type_nom: opt?.text ?? "",
                  }));
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 outline-none"
              >
                <option value="">Sélectionner</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Montant</label>
              <input
                type="text"
                value={form.montant}
                onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))}
                placeholder="ex. 15 000 €"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Durée</label>
              <input
                type="text"
                value={form.duree}
                onChange={(e) => setForm((f) => ({ ...f, duree: e.target.value }))}
                placeholder="ex. 48 mois"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={pendingBank}
              className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Déposer la demande
            </button>
          </form>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h3 className="text-base font-semibold text-slate-800 mb-2">Suivi de ma demande</h3>
          <p className="text-slate-600 text-sm mb-4">État actuel et prochaines étapes.</p>
          {derniere ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-800">
                      {derniere.type_nom || derniere.type_credit?.nom || "—"} · {derniere.montant}
                    </p>
                    <p className="text-slate-600 text-sm mt-1">Durée : {derniere.duree}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      Déposé le {new Date(derniere.created_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      derniere.statut === "validee"
                        ? "bg-green-100 text-green-800"
                        : derniere.statut === "refusee"
                        ? "bg-red-100 text-red-800"
                        : derniere.statut === "en_attente_infos"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {DEMANDE_STATUTS[derniere.statut] ?? derniere.statut}
                  </span>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-4">
                  <span className="text-sm text-slate-600">Documents déposés : {docsCount}</span>
                  <Link
                    href="/dashboard/client/documents"
                    className="text-sm text-primary-600 font-medium hover:underline"
                  >
                    Gérer les documents →
                  </Link>
                </div>
              </div>
              {canBookRdv && (
                <div className="p-4 rounded-xl bg-primary-50 border border-primary-100">
                  <p className="text-primary-800 text-sm font-medium mb-2">
                    Vos documents sont déposés. Réservez un rendez-vous pour discuter du statut de votre demande avec votre conseiller.
                  </p>
                  <Link
                    href={rdvUrl}
                    className="inline-flex px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
                  >
                    Réserver un rendez-vous
                  </Link>
                </div>
              )}
              {derniere && docsCount === 0 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <p className="text-amber-800 text-sm">
                    Déposez vos documents justificatifs pour avancer dans le traitement de votre demande.
                  </p>
                  <Link
                    href="/dashboard/client/documents"
                    className="inline-flex mt-2 text-sm text-primary-600 font-medium hover:underline"
                  >
                    Déposer des documents →
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
              <p className="text-sm font-medium text-slate-700">Aucune demande en cours</p>
              <p className="text-xs text-slate-500 mt-1">Déposez une demande pour voir le suivi ici.</p>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
