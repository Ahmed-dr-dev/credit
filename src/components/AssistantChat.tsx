"use client";

import { useState, useRef, useEffect } from "react";

type Message = { id: string; role: "user" | "assistant"; text: string; date: Date };

const initialMessage: Message = {
  id: "0",
  role: "assistant",
  text: "Bonjour, je suis l'assistant de la plateforme crédit. Choisissez une question ci-dessous ou posez la vôtre.",
  date: new Date(),
};

const PLACEHOLDER_QUESTIONS = [
  "Quels sont les types de crédit proposés ?",
  "Quels documents dois-je fournir ?",
  "Comment déposer une demande de crédit ?",
  "Comment prendre rendez-vous avec un conseiller ?",
  "Quel est le délai de traitement ?",
  "Comment créer un compte ?",
  "Où suivre l'état de ma demande ?",
];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

type QARule = { keywords: string[]; response: string };

const QA: QARule[] = [
  {
    keywords: ["type", "types", "credit", "crédit", "consommation", "immobilier", "professionnel", "quel type"],
    response:
      "Nous proposons trois types de crédit :\n\n• **Crédit à la consommation** : véhicule, équipement, travaux. Durée max 84 mois.\n• **Crédit immobilier** : achat ou construction. Durée 25–30 ans.\n• **Crédit professionnel** : trésorerie, investissement entreprise. Durée variable.\n\nConnectez-vous et allez dans « Documentation & types de crédit » pour les détails.",
  },
  {
    keywords: ["document", "documents", "fournir", "pièce", "justificatif", "liste", "dossier"],
    response:
      "Les documents demandés dépendent du type de crédit. En général : pièce d'identité, justificatif de domicile, justificatifs de revenus, RIB. Pour le crédit immobilier on demande aussi avis d'imposition et offre de prêt. Pour le professionnel : statuts, Kbis, comptes annuels. Une fois connecté, consultez « Documentation & types de crédit » ou « Documents » pour déposer les pièces.",
  },
  {
    keywords: ["demande", "deposer", "déposer", "comment faire", "procedure", "procédure", "etape", "étape"],
    response:
      "Pour déposer une demande : 1) Créez un compte (Inscription client). 2) Connectez-vous et allez dans « Ma demande ». 3) Remplissez le formulaire (type de crédit, montant, durée). 4) Déposez vos documents justificatifs dans « Documents ». 5) Vous pouvez réserver un rendez-vous pour faire le point avec un conseiller.",
  },
  {
    keywords: ["rendez-vous", "rdv", "rendez vous", "conseiller", "rencontrer", "prendre rdv"],
    response:
      "Une fois connecté, allez dans « Rendez-vous » depuis votre tableau de bord client. Vous pouvez demander un rendez-vous pour discuter du statut de votre dossier ou de votre demande avec un conseiller. Le responsable de votre dossier pourra confirmer ou proposer une date.",
  },
  {
    keywords: ["delai", "délai", "duree", "durée", "combien de temps", "traitement", "etude", "étude"],
    response:
      "Le délai de traitement varie selon la complexité du dossier et le type de crédit. Votre demande passe par les statuts : en attente, en cours d'étude, puis validée ou refusée. Pour un suivi précis, connectez-vous à « Ma demande » ou prenez rendez-vous avec votre conseiller.",
  },
  {
    keywords: ["montant", "combien", "emprunter", "plafond", "maximum"],
    response:
      "Le montant et la durée dépendent du type de crédit et de votre profil. Consommation : jusqu'à 84 mois. Immobilier : selon apport, sur 25–30 ans. Professionnel : variable. Connectez-vous et consultez « Documentation & types de crédit » pour les plafonds, ou déposez une demande pour une étude personnalisée.",
  },
  {
    keywords: ["reclamation", "réclamation", "reclamer", "plainte", "probleme", "problème"],
    response:
      "Pour toute réclamation, connectez-vous et allez dans « Réclamations ». Vous pouvez décrire votre sujet et votre message. L'équipe traitera votre demande (statuts : en attente, en cours, traitée).",
  },
  {
    keywords: ["connexion", "connecter", "compte", "inscription", "inscrire", "s'inscrire", "creer un compte"],
    response:
      "Pour vous connecter : cliquez sur « Connexion » en haut de la page. Pour créer un compte client : « Inscription client ». Après inscription, vous pourrez déposer une demande, envoyer vos documents et gérer vos rendez-vous depuis le tableau de bord.",
  },
  {
    keywords: ["statut", "etat", "état", "suivi", "ou en est", "avancement"],
    response:
      "Pour suivre l'état de votre demande, connectez-vous et allez dans « Ma demande ». Vous y verrez le statut (en attente, en cours d'étude, validée, etc.), les documents déposés et vous pourrez réserver un rendez-vous pour en discuter avec votre conseiller.",
  },
  {
    keywords: ["refuse", "refusee", "refusée", "accepter", "acceptee", "acceptée"],
    response:
      "Si votre demande est refusée, vous pouvez contacter votre conseiller via un rendez-vous ou une réclamation pour comprendre les motifs et les options possibles (autre type de crédit, montant, documents complémentaires).",
  },
  {
    keywords: ["bonjour", "salut", "hello", "coucou"],
    response: "Bonjour ! Comment puis-je vous aider ? Posez-moi une question sur les crédits, les documents ou la plateforme.",
  },
  {
    keywords: ["merci", "thanks"],
    response: "Avec plaisir. N'hésitez pas si vous avez d'autres questions.",
  },
  {
    keywords: ["identite", "identité", "piece", "pièce", "cni", "passeport"],
    response:
      "Une pièce d'identité valide (carte d'identité ou passeport) est demandée pour toute demande de crédit. Vous la déposez dans « Documents » après avoir créé votre demande, en la téléchargeant depuis votre espace client.",
  },
  {
    keywords: ["domicile", "justificatif de domicile", "facture", "edf"],
    response:
      "Un justificatif de domicile de moins de 3 mois (facture, quittance de loyer, avis d'imposition) est généralement demandé. Déposez-le dans la section « Documents » de votre dossier.",
  },
  {
    keywords: ["revenus", "salaire", "bulletin", "fiche de paie", "revenu"],
    response:
      "Les justificatifs de revenus (bulletins de salaire, attestation employeur, avis d'imposition) permettent d'étudier votre capacité de remboursement. Le nombre demandé peut varier selon le type de crédit (3 derniers bulletins pour l'immobilier par exemple).",
  },
  {
    keywords: ["rib", "iban", "compte bancaire"],
    response:
      "Un RIB (relevé d'identité bancaire) est demandé pour le versement du prêt et les prélèvements des mensualités. Vous pouvez le fournir dans « Documents ».",
  },
  {
    keywords: ["credit immobilier", "immobilier", "achat maison", "construction", "pret immobilier"],
    response:
      "Le **crédit immobilier** sert à l'achat ou la construction d'un bien. Durée typique : 25 à 30 ans. Documents souvent demandés : pièce d'identité, justificatif de domicile, revenus (3 bulletins), avis d'imposition, offre de prêt en cours, compromis ou promesse de vente. Connectez-vous pour voir la liste complète dans « Documentation & types de crédit ».",
  },
  {
    keywords: ["credit consommation", "consommation", "voiture", "auto", "travaux", "equipement"],
    response:
      "Le **crédit à la consommation** couvre véhicule, équipement, travaux. Durée max : 84 mois. Documents usuels : pièce d'identité, justificatif de domicile, justificatifs de revenus, RIB. Tout se fait depuis « Ma demande » et « Documents » après connexion.",
  },
  {
    keywords: ["credit pro", "professionnel", "entreprise", "travail independant", "tpe", "pme"],
    response:
      "Le **crédit professionnel** est destiné aux entreprises (trésorerie, investissement). Documents typiques : statuts, Kbis, comptes annuels, prévisionnel ou business plan, justificatifs de revenus des dirigeants. Consultez « Documentation & types de crédit » une fois connecté.",
  },
  {
    keywords: ["taux", "taux d'interet", "interet", "intérêt", "taeg", "mensualite", "mensualité"],
    response:
      "Les taux et mensualités dépendent du type de crédit, de la durée et de votre profil. Pour une simulation ou une offre précise, déposez une demande ou prenez rendez-vous avec un conseiller qui pourra vous donner des chiffres personnalisés.",
  },
  {
    keywords: ["assurance", "assurance emprunteur", "deces", "invalidite"],
    response:
      "L'assurance emprunteur (décès, invalidité, etc.) peut être demandée selon le type et le montant du crédit. Les modalités vous seront précisées lors de l'étude de votre dossier ou en rendez-vous avec votre conseiller.",
  },
  {
    keywords: ["nouveaute", "nouveauté", "actualite", "actualité", "info", "notification"],
    response:
      "Une fois connecté, la section « Nouveautés » de votre tableau de bord client affiche les mises à jour liées à votre dossier (avancement de la demande, rendez-vous, etc.).",
  },
  {
    keywords: ["mot de passe", "oublie", "oublié", "reset", "reinitialiser"],
    response:
      "En cas de mot de passe oublié, utilisez le lien « Mot de passe oublié » sur la page de connexion. Vous recevrez les instructions par email pour réinitialiser votre mot de passe.",
  },
  {
    keywords: ["securise", "sécurisé", "donnees", "données", "confidentialite", "confidentialité"],
    response:
      "La plateforme sécurise vos données. Connectez-vous uniquement depuis un appareil personnel et ne partagez pas vos identifiants. Pour toute question sur la confidentialité, vous pouvez adresser une réclamation depuis votre espace connecté.",
  },
  {
    keywords: ["aide", "help", "comment", "quoi faire"],
    response:
      "Vous pouvez : consulter les types de crédit et la documentation, déposer une demande, envoyer vos documents, réserver un rendez-vous et suivre votre dossier dans « Ma demande ». Posez une question précise si vous voulez un détail !",
  },
  {
    keywords: ["au revoir", "bye", "a bientot", "à bientôt"],
    response: "À bientôt ! N'hésitez pas à revenir si vous avez d'autres questions.",
  },
];

const FALLBACK =
  "Je n'ai pas trouvé de réponse précise à votre question. Vous pouvez reformuler ou consulter la page « Documentation & types de crédit » après connexion. Pour un suivi personnalisé de votre dossier, connectez-vous et utilisez « Ma demande » ou réservez un rendez-vous avec votre conseiller.";

function getResponse(userText: string): string {
  const normalized = normalize(userText);
  if (!normalized.trim()) return FALLBACK;
  for (const { keywords, response } of QA) {
    if (keywords.some((k) => normalized.includes(normalize(k)))) return response;
  }
  return FALLBACK;
}

export default function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendQuestion = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: trimmed,
      date: new Date(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    const reply = getResponse(trimmed);
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          text: reply,
          date: new Date(),
        },
      ]);
    }, 400);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuestion(input);
  };

  return (
    <div className="flex flex-col h-[420px] w-full max-w-2xl mx-auto">
      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 space-y-4 mb-4 shadow-card">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                msg.role === "user"
                  ? "bg-primary-600 text-white"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">
                {msg.text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
                  i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                )}
              </p>
            </div>
            {msg.id === "0" && (
              <div className="flex flex-wrap gap-2 mt-3 max-w-[85%]">
                {PLACEHOLDER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendQuestion(q)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-800 transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Posez votre question..."
          className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none"
        />
        <button
          type="submit"
          className="px-5 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
