"use client";

import { useState } from "react";
import AssistantChat from "@/components/AssistantChat";

export default function FloatingAssistant() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-primary-50">
            <h3 className="text-sm font-semibold text-slate-800">Assistant Crédit</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-500 hover:text-slate-700 text-sm"
              aria-label="Fermer l'assistant"
            >
              Fermer
            </button>
          </div>
          <div className="p-3">
            <AssistantChat compact />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-14 w-14 rounded-full bg-primary-600 text-white shadow-xl hover:bg-primary-700 transition flex items-center justify-center"
        aria-label="Ouvrir l'assistant"
      >
        <span className="text-xl">💬</span>
      </button>
    </div>
  );
}
