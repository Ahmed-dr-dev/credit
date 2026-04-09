import Link from "next/link";
import Image from "next/image";
import PublicNav from "@/components/PublicNav";

const STEPS = [
  {
    num: "01",
    title: "Créez votre compte",
    desc: "Inscrivez-vous en quelques minutes et accédez à votre espace client sécurisé.",
  },
  {
    num: "02",
    title: "Déposez votre demande",
    desc: "Remplissez le formulaire, choisissez le type de crédit et téléversez vos documents.",
  },
  {
    num: "03",
    title: "Suivez votre dossier",
    desc: "Consultez l'état de traitement en temps réel et échangez avec votre conseiller.",
  },
  {
    num: "04",
    title: "Recevez la décision",
    desc: "Vous êtes notifié par e-mail dès que votre demande est validée ou refusée.",
  },
];

const CREDIT_TYPES = [
  {
    icon: "🏠",
    label: "Crédit immobilier",
    desc: "Achat ou construction d'un bien. Durée jusqu'à 30 ans.",
    badge: "Jusqu'à 30 ans",
  },
  {
    icon: "🚗",
    label: "Crédit à la consommation",
    desc: "Véhicule, travaux, équipement. Durée max 84 mois.",
    badge: "Jusqu'à 84 mois",
  },
  {
    icon: "🏢",
    label: "Crédit professionnel",
    desc: "Trésorerie, investissement pour TPE et PME.",
    badge: "Sur mesure",
  },
];

const STATS = [
  { value: "+5 000", label: "Clients accompagnés" },
  { value: "98 %", label: "Taux de satisfaction" },
  { value: "48 h", label: "Délai de réponse moyen" },
  { value: "3", label: "Types de crédit disponibles" },
];

const DOCS = [
  { icon: "🪪", text: "Pièce d'identité valide" },
  { icon: "🏡", text: "Justificatif de domicile (– 3 mois)" },
  { icon: "💶", text: "Justificatifs de revenus" },
  { icon: "🏦", text: "RIB (relevé d'identité bancaire)" },
  { icon: "📄", text: "Avis d'imposition (crédit immobilier)" },
  { icon: "📋", text: "Statuts / Kbis (crédit professionnel)" },
];

const FAQ = [
  {
    q: "Qui peut déposer une demande de crédit ?",
    a: "Tout particulier majeur ou professionnel disposant d'un compte sur la plateforme.",
  },
  {
    q: "Comment suivre l'état de mon dossier ?",
    a: "Depuis votre espace client, rubrique « Ma demande », vous consultez le statut en temps réel.",
  },
  {
    q: "Quel est le délai de traitement ?",
    a: "Un premier retour vous est adressé sous 48 h ouvrées. L'étude complète varie selon la complexité.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Oui. La plateforme utilise un chiffrement de bout en bout et une authentification sécurisée par session.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-hero-gradient bg-grid-pattern bg-grid">
      <PublicNav />

      <main className="flex-1 flex flex-col items-center">
        {/* ── HERO ── */}
        <section className="w-full flex flex-col items-center px-4 py-20 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-primary-200/30 blur-3xl -z-10" />
          <div className="max-w-2xl text-center">
            <div className="flex justify-center mb-6">
              <Image
                src="/uploads/BNA000_156497a5-b630-4ae1-9200-70277bb63686_b.jpg"
                alt="Logo BNA"
                width={220}
                height={72}
                className="h-16 w-auto rounded-lg shadow-card"
              />
            </div>
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
              <Link href="/signin" className="px-6 py-3.5 rounded-xl border-2 border-primary-200 text-primary-700 font-semibold hover:bg-primary-50 hover:border-primary-300 transition shadow-card">
                Se connecter
              </Link>
              <Link href="/signup" className="px-6 py-3.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition shadow-soft">
                Créer un compte client
              </Link>
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="w-full bg-primary-600 py-12 px-4">
          <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-bold text-white mb-1">{s.value}</p>
                <p className="text-primary-100 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── COMMENT ÇA MARCHE ── */}
        <section id="comment-ca-marche" className="w-full px-4 py-20 bg-white/60 backdrop-blur">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-medium mb-3">
                Processus
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Comment ça marche ?</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step) => (
                <div key={step.num} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card relative">
                  <span className="absolute -top-3 -left-3 w-9 h-9 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center shadow">
                    {step.num}
                  </span>
                  <h3 className="font-semibold text-slate-800 mb-2 mt-1">{step.title}</h3>
                  <p className="text-sm text-slate-600">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TYPES DE CRÉDIT ── */}
        <section id="types-credit" className="w-full px-4 py-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-medium mb-3">
                Nos offres
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Types de crédit disponibles</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {CREDIT_TYPES.map((c) => (
                <div key={c.label} className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-card flex flex-col gap-3 hover:border-primary-300 hover:shadow-md transition">
                  <div className="text-3xl">{c.icon}</div>
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 text-xs font-medium mb-2">
                      {c.badge}
                    </span>
                    <h3 className="font-semibold text-slate-800 mb-1">{c.label}</h3>
                    <p className="text-sm text-slate-600">{c.desc}</p>
                  </div>
                  <Link href="/signup" className="mt-auto inline-flex items-center text-sm font-medium text-primary-600 hover:underline">
                    Faire une demande →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── DOCUMENTS REQUIS ── */}
        <section className="w-full px-4 py-20 bg-slate-50/80 backdrop-blur">
          <div className="max-w-5xl mx-auto grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-medium mb-3">
                Dossier
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">Documents généralement requis</h2>
              <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                La liste exacte dépend du type de crédit. Après inscription, l&apos;espace « Documents » vous guide pas à pas pour téléverser chaque pièce.
              </p>
              <Link href="/signup" className="inline-flex px-5 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition shadow-soft">
                Ouvrir un dossier
              </Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {DOCS.map((d) => (
                <li key={d.text} className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-card text-sm text-slate-700">
                  <span className="text-xl shrink-0">{d.icon}</span>
                  {d.text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="w-full px-4 py-20">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-medium mb-3">
                FAQ
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Questions fréquentes</h2>
            </div>
            <div className="flex flex-col gap-4">
              {FAQ.map((item) => (
                <div key={item.q} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                  <p className="font-semibold text-slate-800 mb-1">{item.q}</p>
                  <p className="text-sm text-slate-600">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA FINAL ── */}
        <section className="w-full px-4 py-20 bg-primary-600">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold text-white mb-2">Prêt à déposer votre demande ?</h2>
              <p className="text-primary-100 text-sm">Créez votre compte en 2 minutes et commencez votre dossier.</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link href="/signin" className="px-5 py-3 rounded-xl border-2 border-white/40 text-white font-semibold hover:bg-white/10 transition text-sm">
                Se connecter
              </Link>
              <Link href="/signup" className="px-5 py-3 rounded-xl bg-white text-primary-700 font-semibold hover:bg-primary-50 transition shadow text-sm">
                Créer un compte
              </Link>
            </div>
          </div>
          <div className="flex justify-center mt-10">
            <Image
              src="/uploads/BNA000_156497a5-b630-4ae1-9200-70277bb63686_b.jpg"
              alt="BNA Bank"
              width={160}
              height={52}
              className="h-10 w-auto rounded-md opacity-90"
            />
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-primary-100/80 py-8 bg-white/50">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-sm">
          <div className="flex items-center gap-2">
            <Image
              src="/uploads/BNA000_156497a5-b630-4ae1-9200-70277bb63686_b.jpg"
              alt="BNA Bank"
              width={80}
              height={26}
              className="h-6 w-auto rounded"
            />
            <span>BNA Bank — Plateforme de gestion des crédits</span>
          </div>
          <span>Projet de fin d&apos;études &copy; {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
