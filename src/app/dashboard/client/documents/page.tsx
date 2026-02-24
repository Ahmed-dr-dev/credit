"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import PageIntro from "@/components/client/PageIntro";
import { DOCUMENT_STATUTS } from "@/lib/statuts";

type Demande = { id: string; type_nom: string | null; montant: string };
type Document = { id: string; nom: string; statut: string; created_at: string; fichier_url?: string | null };

export default function ClientDocuments() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [selectedDemandeId, setSelectedDemandeId] = useState<string>("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [form, setForm] = useState({ nom: "" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "client")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role !== "client") return;
    fetch("/api/demandes", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Demande[]) => {
        setDemandes(d);
        setSelectedDemandeId((prev) => (prev ? prev : d[0]?.id ?? ""));
      });
  }, [role]);

  useEffect(() => {
    if (!selectedDemandeId) {
      setDocuments([]);
      return;
    }
    fetch(`/api/documents?demandeId=${selectedDemandeId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setDocuments)
      .catch(() => setDocuments([]));
  }, [selectedDemandeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDemandeId || !form.nom.trim()) return;
    if (!file || file.size === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("demande_id", selectedDemandeId);
      fd.set("nom", form.nom.trim());
      fd.set("file", file);
      const r = await fetch("/api/documents", { method: "POST", credentials: "include", body: fd });
      if (r.ok) {
        const data = await r.json();
        setDocuments((prev) => [data, ...prev]);
        setForm({ nom: "" });
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 8000);
      }
    } finally {
      setUploading(false);
    }
  };

  const rdvUrl =
    selectedDemandeId
      ? `/dashboard/client/rendez-vous?demande=${selectedDemandeId}&motif=Discussion%20statut%20dossier%20cr%C3%A9dit&fromDocs=1`
      : "/dashboard/client/rendez-vous";

  if (!isAuthenticated || role !== "client") return null;

  return (
    <DashboardLayout role="client" title="Documents">
      <PageIntro
        title="Documents justificatifs"
        description="Déposez vos documents pour votre dossier crédit. Le responsable pourra les consulter et les valider."
        icon="📁"
      />

      {justAdded && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 flex flex-wrap items-center justify-between gap-4">
          <p className="text-green-800 font-medium">Document enregistré.</p>
          <Link
            href={rdvUrl}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition"
          >
            Réserver un rendez-vous pour discuter du statut →
          </Link>
        </div>
      )}

      <div className="space-y-8 max-w-2xl">
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h3 className="text-base font-semibold text-slate-800 mb-2">Déposer un document</h3>
          <p className="text-slate-600 text-sm mb-4">
            Choisissez un fichier (PDF, image, etc.) et donnez-lui un nom. Le fichier sera enregistré sur la plateforme.
          </p>
          {demandes.length === 0 ? (
            <p className="text-slate-500 text-sm">
              Déposez d&apos;abord une demande de crédit pour pouvoir ajouter des documents.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dossier</label>
                <select
                  value={selectedDemandeId}
                  onChange={(e) => setSelectedDemandeId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 outline-none"
                >
                  {demandes.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.type_nom || "—"} — {d.montant}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fichier</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom du document</label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                  placeholder="ex. Pièce d&apos;identité"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={uploading}
                className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {uploading ? "Envoi…" : "Ajouter le document"}
              </button>
            </form>
          )}
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h3 className="text-base font-semibold text-slate-800">Documents déposés</h3>
            {documents.length > 0 && (
              <Link
                href={rdvUrl}
                className="text-sm text-primary-600 font-medium hover:underline"
              >
                Réserver un rendez-vous pour discuter du statut →
              </Link>
            )}
          </div>
          {demandes.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Dossier</label>
              <select
                value={selectedDemandeId}
                onChange={(e) => setSelectedDemandeId(e.target.value)}
                className="w-full max-w-xs px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500/30 outline-none"
              >
                {demandes.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.type_nom || "—"} — {d.montant}
                  </option>
                ))}
              </select>
            </div>
          )}
          {documents.length === 0 ? (
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-6 text-center">
              <p className="text-slate-600 text-sm">Aucun document déposé pour ce dossier.</p>
              <p className="text-xs text-slate-500 mt-1">
                Une fois vos documents déposés, vous pourrez réserver un rendez-vous pour discuter du statut avec votre conseiller.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex justify-between items-center p-4 rounded-lg border border-slate-200"
                >
                  <div>
                    <p className="font-medium text-slate-800">{doc.nom}</p>
                    <p className="text-xs text-slate-500">
                      Déposé le {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                    </p>
                    {doc.fichier_url && (
                      <a
                        href={doc.fichier_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-600 hover:underline mt-1 inline-block"
                      >
                        Télécharger le fichier
                      </a>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      doc.statut === "valide"
                        ? "bg-green-100 text-green-800"
                        : doc.statut === "refuse"
                        ? "bg-red-100 text-red-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {DOCUMENT_STATUTS[doc.statut] ?? doc.statut}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
