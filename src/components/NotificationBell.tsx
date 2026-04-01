"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Notif = {
  id: string;
  message: string;
  lue: boolean;
  created_at: string;
  rdv_id: string | null;
};

export default function NotificationBell() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    fetch("/api/notifications", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setNotifs(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifs.filter((n) => !n.lue).length;

  const markOne = async (n: Notif) => {
    if (!n.lue) {
      await fetch(`/api/notifications/${n.id}`, {
        method: "PATCH",
        credentials: "include",
      });
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, lue: true } : x)));
    }
  };

  const markAll = async () => {
    await fetch("/api/notifications", { method: "PATCH", credentials: "include" });
    setNotifs((prev) => prev.map((n) => ({ ...n, lue: true })));
  };

  const dateStr = (s: string) =>
    new Date(s).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-slate-100 transition"
        aria-label="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 max-h-[440px] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 sticky top-0 bg-white z-10">
            <span className="text-sm font-semibold text-slate-800">
              Notifications {unread > 0 && <span className="text-red-500">({unread})</span>}
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="text-xs text-primary-600 hover:underline font-medium"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* List */}
          {notifs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              Aucune notification
            </div>
          ) : (
            <ul>
              {notifs.map((n) => (
                <li
                  key={n.id}
                  onClick={() => markOne(n)}
                  className={`px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition flex gap-3 items-start ${
                    !n.lue ? "bg-primary-50/60" : ""
                  }`}
                >
                  {!n.lue && (
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-primary-500 shrink-0" />
                  )}
                  <div className={!n.lue ? "" : "ml-5"}>
                    <p className="text-sm text-slate-700 leading-snug">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{dateStr(n.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
