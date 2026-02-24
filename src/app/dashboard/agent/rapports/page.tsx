"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { DEMANDE_STATUTS } from "@/lib/statuts";

type Demande = {
  id: string;
  montant: string;
  duree: string;
  type_nom: string | null;
  statut: string;
  created_at: string;
  client?: { prenom: string; nom: string; email: string } | null;
};

type Document = {
  id: string;
  nom: string;
  statut: string;
  created_at: string;
};

function downloadCsv(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function AgentRapports() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [selectedDemandeId, setSelectedDemandeId] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "agent")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  useEffect(() => {
    if (role === "agent") {
      fetch("/api/demandes", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          setDemandes(Array.isArray(data) ? data : []);
          if (!selectedDemandeId && data?.[0]?.id) setSelectedDemandeId(data[0].id);
        })
        .catch(() => setDemandes([]));
    }
  }, [role]);

  useEffect(() => {
    if (!selectedDemandeId) {
      setDocuments([]);
      return;
    }
    setLoadingDocs(true);
    fetch(`/api/documents?demandeId=${selectedDemandeId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Document[]) => setDocuments(Array.isArray(d) ? d : []))
      .catch(() => setDocuments([]))
      .finally(() => setLoadingDocs(false));
  }, [selectedDemandeId]);

  const selectedDemande = demandes.find((d) => d.id === selectedDemandeId);
  const clientName = (d: Demande) =>
    d.client ? `${d.client.prenom} ${d.client.nom}`.trim() : "—";

  const statsByStatut = demandes.reduce<Record<string, number>>((acc, d) => {
    acc[d.statut] = (acc[d.statut] ?? 0) + 1;
    return acc;
  }, {});

  const printFicheDemande = () => {
    if (!printRef.current) return;
    const prevTitle = document.title;
    document.title = `Fiche demande ${selectedDemandeId.slice(0, 8)}`;
    const printContent = printRef.current.innerHTML;
    const w = window.open("", "_blank");
    if (!w) {
      document.title = prevTitle;
      return;
    }
    w.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>${document.title}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 24px; color: #1e293b; font-size: 14px; }
        h1 { font-size: 18px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
        th { background: #f1f5f9; font-weight: 600; }
        .meta { color: #64748b; font-size: 12px; margin-top: 24px; }
      </style></head><body>${printContent}</body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.close();
      document.title = prevTitle;
    }, 250);
  };

  const exportStatsCsv = () => {
    const rows = [
      ["Statut", "Libellé", "Nombre"],
      ...Object.entries(statsByStatut).map(([statut, n]) => [
        statut,
        DEMANDE_STATUTS[statut] ?? statut,
        String(n),
      ]),
      ["", "Total", String(demandes.length)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    downloadCsv(csv, `rapport-statistiques-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const printStats = () => {
    const lines = [
      "Rapport statistiques — Dossiers affectés",
      `Généré le ${new Date().toLocaleString("fr-FR")}`,
      "",
      ...Object.entries(statsByStatut).map(
        ([s, n]) => `  ${DEMANDE_STATUTS[s] ?? s} : ${n}`
      ),
      `  Total : ${demandes.length}`,
    ];
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>Rapport statistiques</title>
      <style>body { font-family: system-ui; padding: 24px; white-space: pre-wrap; }</style></head><body>${lines.join("\n")}</body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 250);
  };

  const exportAvisCsv = () => {
    const rows = [
      ["Client", "Email", "Type crédit", "Montant", "Durée", "Avis (statut)", "Date demande"],
      ...demandes.map((d) => [
        clientName(d),
        d.client?.email ?? "",
        d.type_nom ?? "",
        d.montant,
        d.duree,
        DEMANDE_STATUTS[d.statut] ?? d.statut,
        new Date(d.created_at).toLocaleDateString("fr-FR"),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    downloadCsv(csv, `avis-responsable-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const printAvis = () => {
    const headers = ["Client", "Type", "Montant", "Avis"];
    const rows = demandes.map((d) => [
      clientName(d),
      d.type_nom ?? "—",
      d.montant,
      DEMANDE_STATUTS[d.statut] ?? d.statut,
    ]);
    const tableRows = rows
      .map(
        (r) =>
          `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`
      )
      .join("");
    const thead = `<tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>Avis responsable</title>
      <style>body { font-family: system-ui; padding: 24px; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; } th { background: #f1f5f9; }</style></head><body>
      <h1>Avis responsable</h1><p>Généré le ${new Date().toLocaleString("fr-FR")}</p>
      <table><thead>${thead}</thead><tbody>${tableRows}</tbody></table></body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 250);
  };

  if (!isAuthenticated || role !== "agent") return null;

  return (
    <DashboardLayout role="agent" title="Exporter / Rapports">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Rapports et export</h1>
        <p className="mt-1 text-slate-600 text-sm">
          Fiche demande, statistiques de vos dossiers et avis responsable — export CSV et impression (PDF via « Enregistrer au format PDF »).
        </p>
      </div>

      <div className="space-y-8">
        {/* Fiche demande — imprimer */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Fiche demande (impression / PDF)</h2>
          <p className="text-slate-600 text-sm mb-4">
            Sélectionnez une demande pour afficher le récapitulatif (client, type, montant, documents). Vous pouvez ensuite imprimer ou enregistrer en PDF.
          </p>
          <div className="flex flex-wrap items-end gap-4 mb-4">
            <div className="min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Demande</label>
              <select
                value={selectedDemandeId}
                onChange={(e) => setSelectedDemandeId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 outline-none"
              >
                <option value="">— Choisir —</option>
                {demandes.map((d) => (
                  <option key={d.id} value={d.id}>
                    {clientName(d)} — {d.type_nom || "—"} — {d.montant}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={printFicheDemande}
              disabled={!selectedDemande || loadingDocs}
              className="px-4 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 transition"
            >
              {loadingDocs ? "Chargement…" : "Imprimer la fiche"}
            </button>
          </div>
          {selectedDemande && (
            <div
              ref={printRef}
              className="rounded-lg border border-slate-200 bg-slate-50/50 p-5 print:border-0 print:bg-white"
            >
              <h1 className="text-lg font-semibold text-slate-800">Fiche demande de crédit</h1>
              <table className="w-full text-sm mt-3">
                <tbody>
                  <tr><td className="font-medium text-slate-600 py-1 w-40">Client</td><td>{clientName(selectedDemande)}</td></tr>
                  <tr><td className="font-medium text-slate-600 py-1">Email</td><td>{selectedDemande.client?.email ?? "—"}</td></tr>
                  <tr><td className="font-medium text-slate-600 py-1">Type</td><td>{selectedDemande.type_nom ?? "—"}</td></tr>
                  <tr><td className="font-medium text-slate-600 py-1">Montant</td><td>{selectedDemande.montant}</td></tr>
                  <tr><td className="font-medium text-slate-600 py-1">Durée</td><td>{selectedDemande.duree}</td></tr>
                  <tr><td className="font-medium text-slate-600 py-1">Statut</td><td>{DEMANDE_STATUTS[selectedDemande.statut] ?? selectedDemande.statut}</td></tr>
                  <tr><td className="font-medium text-slate-600 py-1">Date dépôt</td><td>{new Date(selectedDemande.created_at).toLocaleDateString("fr-FR")}</td></tr>
                </tbody>
              </table>
              <h2 className="text-sm font-semibold text-slate-700 mt-4 mb-2">Documents déposés</h2>
              {documents.length === 0 ? (
                <p className="text-slate-500 text-sm">Aucun document.</p>
              ) : (
                <ul className="list-disc list-inside text-sm text-slate-700">
                  {documents.map((doc) => (
                    <li key={doc.id}>{doc.nom} — {new Date(doc.created_at).toLocaleDateString("fr-FR")}</li>
                  ))}
                </ul>
              )}
              <p className="meta text-slate-500 mt-4">Document généré le {new Date().toLocaleString("fr-FR")} — Plateforme crédit</p>
            </div>
          )}
        </section>

        {/* Statistiques */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Statistiques de vos dossiers</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            {Object.entries(statsByStatut).map(([statut, n]) => (
              <div key={statut} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <p className="text-2xl font-bold text-slate-800">{n}</p>
                <p className="text-sm text-slate-600">{DEMANDE_STATUTS[statut] ?? statut}</p>
              </div>
            ))}
            <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-4">
              <p className="text-2xl font-bold text-primary-800">{demandes.length}</p>
              <p className="text-sm text-primary-700">Total demandes</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exportStatsCsv}
              className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition"
            >
              Exporter en CSV
            </button>
            <button
              type="button"
              onClick={printStats}
              className="px-4 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition"
            >
              Imprimer le rapport
            </button>
          </div>
        </section>

        {/* Avis responsable */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Avis responsable par dossier</h2>
          <p className="text-slate-600 text-sm mb-4">
            Liste de vos dossiers avec l&apos;avis (statut) pour chaque demande. Export CSV ou impression.
          </p>
          {demandes.length > 0 ? (
            <>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="pb-2 pr-4 font-medium">Client</th>
                      <th className="pb-2 pr-4 font-medium">Type</th>
                      <th className="pb-2 pr-4 font-medium">Montant</th>
                      <th className="pb-2 font-medium">Avis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demandes.map((d) => (
                      <tr key={d.id} className="border-b border-slate-100">
                        <td className="py-2 pr-4">{clientName(d)}</td>
                        <td className="py-2 pr-4">{d.type_nom ?? "—"}</td>
                        <td className="py-2 pr-4">{d.montant}</td>
                        <td className="py-2">{DEMANDE_STATUTS[d.statut] ?? d.statut}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={exportAvisCsv}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition"
                >
                  Exporter en CSV
                </button>
                <button
                  type="button"
                  onClick={printAvis}
                  className="px-4 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition"
                >
                  Imprimer la liste
                </button>
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-sm">Aucune demande affectée.</p>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
