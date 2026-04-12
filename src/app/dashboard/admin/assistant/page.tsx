"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

type QA = {
  id: string;
  keywords: string;
  response: string;
  actif: boolean;
  created_at: string;
};

type Pending = {
  id: string;
  question: string;
  nb_fois: number;
  repondu: boolean;
  created_at: string;
};

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none transition text-sm";

const EMPTY = { keywords: "", response: "" };

export default function AssistantQAPage() {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<QA[]>([]);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  // Pending questions state
  const [pending, setPending] = useState<Pending[]>([]);
  const [pendingFetching, setPendingFetching] = useState(true);
  const [answerTarget, setAnswerTarget] = useState<Pending | null>(null);
  const [answerForm, setAnswerForm] = useState({ keywords: "", reponse: "" });
  const [answerSaving, setAnswerSaving] = useState(false);
  const [answerError, setAnswerError] = useState("");
  const [showAnswered, setShowAnswered] = useState(false);

  useEffect(() => {
    if (!loading && (!isAuthenticated || role !== "admin")) router.push("/signin");
  }, [isAuthenticated, role, loading, router]);

  const load = () => {
    setFetching(true);
    fetch("/api/assistant-qa", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .finally(() => setFetching(false));
  };

  useEffect(() => {
    if (role === "admin") load();
  }, [role]);

  const loadPending = () => {
    setPendingFetching(true);
    fetch("/api/assistant-pending", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setPending(Array.isArray(d) ? d : []))
      .finally(() => setPendingFetching(false));
  };

  useEffect(() => {
    if (role === "admin") loadPending();
  }, [role]);

  const resetForm = () => {
    setForm(EMPTY);
    setEditId(null);
    setError("");
    setSuccess("");
  };

  const startEdit = (qa: QA) => {
    setEditId(qa.id);
    setForm({ keywords: qa.keywords, response: qa.response });
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.keywords.trim() || !form.response.trim()) {
      setError("Mots-clés et réponse sont requis.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const url = editId ? `/api/assistant-qa/${editId}` : "/api/assistant-qa";
      const method = editId ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Erreur");
      setSuccess(editId ? "Question mise à jour." : "Question ajoutée.");
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const toggleActif = async (qa: QA) => {
    await fetch(`/api/assistant-qa/${qa.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: !qa.actif }),
    });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette entrée ?")) return;
    await fetch(`/api/assistant-qa/${id}`, { method: "DELETE", credentials: "include" });
    load();
  };

  const startAnswer = (p: Pending) => {
    setAnswerTarget(p);
    // Pre-fill keywords with the first 4 words as a suggestion
    const words = p.question.toLowerCase().replace(/[^a-zA-ZÀ-ÿ0-9 ]/g, "").split(/\s+/).slice(0, 4);
    setAnswerForm({ keywords: words.join(", "), reponse: "" });
    setAnswerError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitAnswer = async () => {
    if (!answerTarget) return;
    if (!answerForm.keywords.trim() || !answerForm.reponse.trim()) {
      setAnswerError("Mots-clés et réponse sont requis.");
      return;
    }
    setAnswerSaving(true);
    setAnswerError("");
    const r = await fetch(`/api/assistant-pending/${answerTarget.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: answerForm.keywords, reponse: answerForm.reponse }),
    });
    setAnswerSaving(false);
    if (r.ok) {
      setAnswerTarget(null);
      setAnswerForm({ keywords: "", reponse: "" });
      loadPending();
      load();
    } else {
      const d = await r.json();
      setAnswerError(d.error || "Erreur lors de la sauvegarde.");
    }
  };

  const dismissPending = async (id: string) => {
    await fetch(`/api/assistant-pending/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dismiss: true }),
    });
    loadPending();
  };

  const deletePending = async (id: string) => {
    if (!confirm("Supprimer cette question ?")) return;
    await fetch(`/api/assistant-pending/${id}`, { method: "DELETE", credentials: "include" });
    loadPending();
  };

  if (!isAuthenticated || role !== "admin") return null;

  const filtered = items.filter(
    (qa) =>
      qa.keywords.toLowerCase().includes(search.toLowerCase()) ||
      qa.response.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout role="admin" title="Gestion des Q&A – Assistant">
      <p className="text-slate-600 text-sm mb-6">
        Gérez les questions types et réponses de l&apos;assistant virtuel de la plateforme.
        Les mots-clés sont séparés par des virgules.
      </p>

      {/* ── Formulaire ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">
          {editId ? "Modifier la question" : "Ajouter une nouvelle question"}
        </h2>

        {error && <p className="mb-3 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
        {success && <p className="mb-3 text-sm text-green-700 bg-green-50 p-3 rounded-lg">{success}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Mots-clés <span className="text-slate-400 font-normal">(séparés par des virgules)</span>
            </label>
            <input
              type="text"
              className={inputClass}
              placeholder="crédit, immobilier, achat maison, pret immobilier"
              value={form.keywords}
              onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
            />
            <p className="mt-1 text-xs text-slate-400">
              L&apos;assistant détecte si l&apos;un de ces mots est présent dans la question de l&apos;utilisateur.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Réponse</label>
            <textarea
              className={`${inputClass} min-h-[120px] resize-y`}
              placeholder="Entrez la réponse à afficher à l'utilisateur..."
              value={form.response}
              onChange={(e) => setForm((f) => ({ ...f, response: e.target.value }))}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : editId ? "Mettre à jour" : "Ajouter"}
            </button>
            {editId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
              >
                Annuler
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ── Liste ── */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-slate-700">
          Questions enregistrées{" "}
          <span className="ml-1 px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
            {items.length}
          </span>
        </h2>
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-primary-500/30 w-56"
        />
      </div>

      {fetching ? (
        <p className="text-slate-500 text-sm">Chargement...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
          {search ? "Aucun résultat pour cette recherche." : "Aucune question enregistrée."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((qa) => (
            <div
              key={qa.id}
              className={`bg-white rounded-2xl border p-5 shadow-card transition ${
                qa.actif ? "border-slate-200" : "border-slate-200 opacity-50"
              }`}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {qa.keywords.split(",").map((kw) => (
                      <span
                        key={kw}
                        className="px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 text-xs font-medium border border-primary-100"
                      >
                        {kw.trim()}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed line-clamp-4">
                    {qa.response}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActif(qa)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                      qa.actif
                        ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                        : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {qa.actif ? "Actif" : "Inactif"}
                  </button>
                  <button
                    onClick={() => startEdit(qa)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-50 text-primary-700 border border-primary-100 hover:bg-primary-100 transition"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(qa.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* ══ QUESTIONS NON RÉPONDUES ══════════════════════════════════════ */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-700">Questions sans réponse</h2>
            {(() => {
              const unanswered = pending.filter((p) => !p.repondu).length;
              return unanswered > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold border border-amber-200">
                  {unanswered} en attente
                </span>
              ) : null;
            })()}
          </div>
          <button
            onClick={() => setShowAnswered((v) => !v)}
            className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
          >
            {showAnswered ? "Masquer les traitées" : "Voir toutes (traitées incluses)"}
          </button>
        </div>

        {/* Answer form */}
        {answerTarget && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6 shadow-card">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Répondre à la question</p>
                <p className="text-sm font-medium text-slate-800">&ldquo;{answerTarget.question}&rdquo;</p>
                <p className="text-xs text-slate-400 mt-0.5">Posée {answerTarget.nb_fois} fois</p>
              </div>
              <button onClick={() => setAnswerTarget(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none shrink-0">×</button>
            </div>

            {answerError && <p className="mb-3 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{answerError}</p>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Mots-clés <span className="text-slate-400 font-normal">(séparés par des virgules)</span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={answerForm.keywords}
                  onChange={(e) => setAnswerForm((f) => ({ ...f, keywords: e.target.value }))}
                  placeholder="crédit, immobilier, taux..."
                />
                <p className="mt-1 text-xs text-slate-400">Pré-rempli depuis la question — ajustez pour une meilleure détection.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Réponse</label>
                <textarea
                  className={`${inputClass} min-h-[120px] resize-y`}
                  value={answerForm.reponse}
                  onChange={(e) => setAnswerForm((f) => ({ ...f, reponse: e.target.value }))}
                  placeholder="Rédigez la réponse que l'assistant affichera..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={submitAnswer}
                  disabled={answerSaving}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition disabled:opacity-50"
                >
                  {answerSaving ? "Enregistrement…" : "Publier la réponse"}
                </button>
                <button
                  onClick={() => setAnswerTarget(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {pendingFetching ? (
          <p className="text-slate-500 text-sm">Chargement…</p>
        ) : (() => {
          const displayed = pending.filter((p) => showAnswered || !p.repondu);
          if (displayed.length === 0) {
            return (
              <div className="text-center py-14 text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
                {showAnswered ? "Aucune question enregistrée." : "Aucune question sans réponse. ✓"}
              </div>
            );
          }
          return (
            <div className="flex flex-col gap-3">
              {displayed.map((p) => (
                <div key={p.id} className={`bg-white rounded-2xl border p-5 shadow-card flex items-start gap-4 ${p.repondu ? "opacity-50" : ""}`}>
                  {/* Count badge */}
                  <div className={`shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center text-xs font-bold ${
                    p.repondu ? "bg-slate-100 text-slate-400" : p.nb_fois >= 3 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
                  }`}>
                    <span className="text-base leading-none">{p.nb_fois}</span>
                    <span className="text-[9px] font-normal leading-none mt-0.5">fois</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 leading-snug">{p.question}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(p.created_at).toLocaleDateString("fr-FR", { dateStyle: "medium" })}
                      {p.repondu && <span className="ml-2 text-emerald-600 font-medium">✓ Répondu</span>}
                    </p>
                  </div>

                  {!p.repondu && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => startAnswer(p)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition"
                      >
                        Répondre
                      </button>
                      <button
                        onClick={() => dismissPending(p.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 transition"
                        title="Ignorer sans répondre"
                      >
                        Ignorer
                      </button>
                      <button
                        onClick={() => deletePending(p.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </DashboardLayout>
  );
}
