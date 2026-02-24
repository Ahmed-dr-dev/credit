import Link from "next/link";
import AssistantChat from "@/components/AssistantChat";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-hero-gradient bg-grid-pattern bg-grid">
      <header className="border-b border-primary-100/80 bg-white/70 backdrop-blur-md shadow-soft">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-primary-700 text-lg tracking-tight">Crédit Bancaire</Link>
          <nav className="flex gap-2 items-center">
            <Link
              href="/#assistant"
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-primary-600 hover:bg-primary-50 text-sm font-medium transition"
            >
              Assistant
            </Link>
            <Link
              href="/signin"
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-primary-600 hover:bg-primary-50 text-sm font-medium transition"
            >
              Connexion
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 shadow-soft transition"
            >
              Inscription client
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-16 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-primary-200/30 blur-3xl -z-10" />
        <div className="max-w-2xl text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-medium mb-6">
            Gestion simplifiée des crédits
          </span>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 tracking-tight mb-5">
            Demandes de crédit et suivi de dossiers
          </h1>
          <p className="text-slate-600 text-lg mb-10 max-w-xl mx-auto">
            Déposez votre demande, prenez rendez-vous et suivez l&apos;état de votre dossier en toute simplicité.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/signin"
              className="px-6 py-3.5 rounded-xl border-2 border-primary-200 text-primary-700 font-semibold hover:bg-primary-50 hover:border-primary-300 transition shadow-card"
            >
              Se connecter
            </Link>
            <Link
              href="/signup"
              className="px-6 py-3.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition shadow-soft"
            >
              Créer un compte client
            </Link>
          </div>
        </div>

        <section id="assistant" className="w-full max-w-2xl">
          <h2 className="text-xl font-semibold text-slate-800 mb-2 text-center">Assistant</h2>
          <p className="text-slate-600 text-sm text-center mb-4">
            Posez vos questions sur les types de crédit, les documents à fournir ou le fonctionnement de la plateforme.
          </p>
          <div className="bg-white/80 backdrop-blur rounded-2xl border border-slate-200 p-6 shadow-card">
            <AssistantChat />
          </div>
        </section>
      </main>

      <footer className="border-t border-primary-100/80 py-6 text-center text-slate-500 text-sm bg-white/50">
        Plateforme de gestion des crédits — Projet de fin d&apos;études
      </footer>
    </div>
  );
}
