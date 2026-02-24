"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { DOCUMENT_STATUTS } from "@/lib/statuts";

type Document = {
  id: string;
  nom: string;
  statut: string;
  created_at: string;
  fichier_url?: string | null;
};

type Demande = {
  id: string;
  client_id?: string;
  montant: string;
  duree: string;
  type_nom: string | null;
  client: { prenom: string; nom: string } | null;
};

function DossiersContent() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const demandeId = searchParams.get("demande") ?? "";
  const [demande, setDemande] = useState<Demande | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [docsComplementaires, setDocsComplementaires] = useState("");
  const [sendingDocs, setSendingDocs] = useState(false);

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "agent")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role !== "agent") return;
    fetch("/api/demandes", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setDemandes(data);
        const d = data.find((x: Demande) => x.id === demandeId) || data[0];
        setDemande(d);
        if (d?.id) {
          fetch(`/api/documents?demandeId=${d.id}`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : []))
            .then(setDocuments)
            .catch(() => {});
        } else {
          setDocuments([]);
        }
      })
      .catch(() => {});
  }, [role, demandeId]);

  const setDocStatut = async (docId: string, statut: string) => {
    const r = await fetch(`/api/documents/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ statut }),
    });
    if (r.ok) {
      const data = await r.json();
      setDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, ...data } : d)));
    }
  };

  const demanderDocumentsComplementaires = async () => {
    const list = docsComplementaires.trim();
    if (!list || !demande?.client_id) return;
    setSendingDocs(true);
    try {
      const r = await fetch("/api/nouveautes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          client_id: demande.client_id,
          demande_id: demande.id,
          titre: "Documents complémentaires requis",
          type_nouveaute: "documents_complementaires",
          description: list,
        }),
      });
      if (r.ok) {
        setDocsComplementaires("");
      }
    } finally {
      setSendingDocs(false);
    }
  };

  if (!isAuthenticated || role !== "agent") return null;

  const clientName = demande?.client ? `${demande.client.prenom} ${demande.client.nom}` : "—";

  return (
    <DashboardLayout role="agent" title="Analyse des dossiers">
      <p className="text-slate-600 text-sm mb-6">Analyser les dossiers et valider les documents fournis par les clients.</p>
      <div className="space-y-6">
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Dossier — {clientName}</h3>
              <p className="text-sm text-slate-600">{demande?.type_nom || "—"} · {demande?.montant || "—"}</p>
            </div>
            <Link href="/dashboard/agent/demandes" className="text-sm text-primary-600 hover:underline">← Retour aux demandes</Link>
          </div>
          <p className="text-slate-600 text-sm mb-4">
            Sélectionnez un dossier :{" "}
            {demandes.map((d) => (
              <Link key={d.id} href={`/dashboard/agent/dossiers?demande=${d.id}`} className="text-primary-600 hover:underline mr-2">
                {d.client ? `${d.client.prenom} ${d.client.nom}` : d.id}
              </Link>
            ))}
          </p>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Documents fournis</h3>
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4">
                <div>
                  <p className="font-medium text-slate-800">{doc.nom}</p>
                  <p className="text-xs text-slate-500">Déposé le {new Date(doc.created_at).toLocaleDateString("fr-FR")}</p>
                  {doc.fichier_url && (
                    <a href={doc.fichier_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline mt-1 inline-block">Télécharger</a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      doc.statut === "valide" ? "bg-green-100 text-green-800"
                      : doc.statut === "refuse" ? "bg-red-100 text-red-800"
                      : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {DOCUMENT_STATUTS[doc.statut] ?? doc.statut}
                  </span>
                  {doc.statut === "en_attente" && (
                    <>
                      <button type="button" onClick={() => setDocStatut(doc.id, "valide")} className="text-sm text-green-600 hover:underline">Valider</button>
                      <button type="button" onClick={() => setDocStatut(doc.id, "refuse")} className="text-sm text-red-600 hover:underline">Refuser</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          {documents.length === 0 && <p className="text-slate-500 text-sm py-4">Aucun document pour ce dossier.</p>}
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h3 className="text-base font-semibold text-slate-800 mb-2">Demander des documents complémentaires</h3>
          <p className="text-slate-600 text-sm mb-4">
            Indiquez ci-dessous la liste des documents à fournir par le client. Il verra ce message dans Nouveautés et pourra déposer les pièces dans Documents.
          </p>
          <textarea
            value={docsComplementaires}
            onChange={(e) => setDocsComplementaires(e.target.value)}
            placeholder="Ex.&#10;- Pièce d'identité recto-verso&#10;- Dernier avis d'imposition&#10;- Justificatif de domicile de moins de 3 mois"
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 outline-none text-sm"
          />
          <button
            type="button"
            onClick={demanderDocumentsComplementaires}
            disabled={!docsComplementaires.trim() || !demande?.client_id || sendingDocs}
            className="mt-3 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition"
          >
            {sendingDocs ? "Envoi…" : "Envoyer la demande au client"}
          </button>
        </section>
      </div>
    </DashboardLayout>
  );
}

export default function AgentDossiers() {
  return (
    <Suspense fallback={<div className="p-8">Chargement...</div>}>
      <DossiersContent />
    </Suspense>
  );
}
