"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";

type Active = "signin" | "signup" | null;

export default function PublicNav({ active = null }: { active?: Active }) {
  const link = "px-4 py-2 rounded-xl text-slate-600 hover:text-primary-600 hover:bg-primary-50 text-sm font-medium transition";
  const activeLink = "px-4 py-2 rounded-xl text-primary-700 bg-primary-50 text-sm font-medium";

  const router = useRouter();
  const pathname = usePathname();

  const handleAccueil = () => {
    if (pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push("/");
    }
  };

  return (
    <header className="border-b border-primary-100/80 bg-white/70 backdrop-blur-md shadow-soft sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/uploads/BNA000_156497a5-b630-4ae1-9200-70277bb63686_b.jpg"
            alt="BNA Bank"
            width={120}
            height={38}
            className="h-9 w-auto rounded-md"
            priority
          />
          <span className="font-bold text-primary-700 text-lg tracking-tight">Crédit Bancaire</span>
        </Link>
        <nav className="flex gap-2 items-center">
          <button
            onClick={handleAccueil}
            className={`${link} hidden sm:inline-flex`}
          >
            Accueil
          </button>
          <Link href="/#comment-ca-marche" className={`${link} hidden sm:inline-flex`}>
            Comment ça marche
          </Link>
          <Link href="/#types-credit" className={`${link} hidden sm:inline-flex`}>
            Types de crédit
          </Link>
          <Link
            href="/signin"
            className={`${active === "signin" ? activeLink : link} ${active === "signin" ? "ring-2 ring-primary-300 ring-offset-2" : ""}`}
          >
            Connexion
          </Link>
          <Link
            href="/signup"
            className={`px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 shadow-soft transition ${
              active === "signup" ? "ring-2 ring-primary-400 ring-offset-2" : ""
            }`}
          >
            Inscription client
          </Link>
        </nav>
      </div>
    </header>
  );
}
