"use client";

import { useState, useRef, useEffect, useCallback } from "react";

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
  "Quels sont vos horaires ?",
  "Comment vous contacter ?",
  "Puis-je simuler mon crédit ?",
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
    keywords: ["bonjour", "salut", "hello", "coucou", "bonsoir", "salam", "hi", "hey", "bjr", "bsr"],
    response: "Bonjour ! 👋 Je suis l'assistant virtuel de BNA Crédit. Je suis là pour répondre à toutes vos questions sur nos crédits, les démarches, vos documents et votre dossier. Comment puis-je vous aider ?",
  },
  {
    keywords: ["merci", "thanks", "thank you", "parfait", "super", "excellent", "très bien", "nickel", "ok merci"],
    response: "Avec plaisir ! 😊 N'hésitez pas à revenir si vous avez d'autres questions. Je suis disponible 24h/24.",
  },
  {
    keywords: ["qui es tu", "qui êtes vous", "qui etes vous", "c'est quoi", "c est quoi", "assistant", "chatbot", "robot", "bot", "tu es qui", "vous etes qui"],
    response: "Je suis l'**assistant virtuel de BNA Crédit**. Je peux répondre à vos questions sur les types de crédit, les documents nécessaires, les démarches d'inscription, le suivi de votre dossier, et bien plus. Pour une aide personnalisée, vous pouvez aussi prendre rendez-vous avec un conseiller.",
  },
  {
    keywords: ["comment ca va", "comment ça va", "ca va", "ça va", "tu vas bien", "vous allez bien"],
    response: "Je suis un assistant virtuel, donc toujours opérationnel ! 😄 Et vous, comment puis-je vous aider aujourd'hui ?",
  },
  {
    keywords: ["au revoir", "bye", "a bientot", "à bientôt", "bonne journee", "bonne journée", "bonne soiree", "bonne soirée", "a plus", "ciao", "tchao"],
    response: "À bientôt ! 👋 N'hésitez pas à revenir si vous avez d'autres questions. Bonne continuation.",
  },
  {
    keywords: ["horaire", "horaires", "ouvert", "ouverture", "disponible", "quand", "heure", "heures"],
    response: "Nos agences BNA sont généralement ouvertes **du lundi au vendredi de 8h à 16h**. La plateforme en ligne, elle, est disponible **24h/24, 7j/7**. Pour les horaires précis d'une agence, contactez-la directement ou consultez le site BNA.",
  },
  {
    keywords: ["contact", "contacter", "telephone", "téléphone", "email", "adresse", "agence", "joindre", "appeler"],
    response: "Vous pouvez contacter BNA via :\n\n• **Plateforme** : depuis votre espace client, rubrique « Réclamations » ou « Rendez-vous ».\n• **Téléphone** : centre d'appels BNA au **71 831 000** (Tunis).\n• **Email** : via le formulaire de contact sur le site officiel bna.tn.\n• **Agence** : toute agence BNA proche de chez vous.",
  },
  {
    keywords: ["simulation", "simuler", "calculer", "calcul", "estimer", "estimation", "mensualite", "mensualité", "combien je vais payer"],
    response: "Pour simuler votre crédit, connectez-vous à votre espace client et déposez une demande avec le montant et la durée souhaités. Votre conseiller calculera la mensualité estimée selon votre profil. Un outil de simulation personnalisé est aussi disponible en agence.",
  },
  {
    keywords: ["plateforme", "site", "application", "comment fonctionne", "comment marche", "principe", "c'est quoi ce site"],
    response: "Cette plateforme BNA vous permet de :\n\n1. **Créer un compte** client en ligne\n2. **Déposer une demande** de crédit (immobilier, consommation ou professionnel)\n3. **Envoyer vos documents** justificatifs\n4. **Suivre l'avancement** de votre dossier en temps réel\n5. **Prendre rendez-vous** avec votre conseiller\n\nTout se fait en ligne, de chez vous, à toute heure.",
  },
  {
    keywords: ["eligible", "éligible", "eligibilite", "éligibilité", "j'ai droit", "conditions", "critere", "critère", "requisit"],
    response: "L'éligibilité dépend de plusieurs critères : **revenus stables**, **capacité de remboursement**, **historique bancaire** et **type de crédit demandé**. Pour savoir si vous êtes éligible, créez un compte et déposez une demande — votre conseiller étudiera votre dossier et vous informera.",
  },
  {
    keywords: ["apport", "apport personnel", "contribution", "mise de depart", "mise de départ"],
    response: "Un apport personnel peut être demandé selon le type de crédit :\n\n• **Immobilier** : généralement 10 à 20 % du montant total.\n• **Consommation** : pas toujours obligatoire.\n• **Professionnel** : variable selon le projet.\n\nVotre conseiller vous précisera le montant lors de l'étude de votre dossier.",
  },
  {
    keywords: ["remboursement", "rembourser", "anticipe", "anticipé", "payer en avance", "solde"],
    response: "Le remboursement anticipé est possible selon les modalités de votre contrat de crédit. Des frais peuvent s'appliquer. Pour connaître les conditions exactes, consultez votre contrat ou contactez votre conseiller via la rubrique « Rendez-vous ».",
  },
  {
    keywords: ["probleme connexion", "problème connexion", "ne marche pas", "bloque", "bloqué", "erreur", "bug", "ne fonctionne pas"],
    response: "Si vous avez un problème technique sur la plateforme :\n\n1. Vérifiez votre connexion Internet.\n2. Effacez le cache de votre navigateur.\n3. Réessayez avec un autre navigateur.\n4. Si le problème persiste, contactez le support via la rubrique « Réclamations » ou appelez le **71 831 000**.",
  },
  {
    keywords: ["securite", "sécurité", "piratage", "fraude", "arnaque", "phishing", "donnees", "données", "confidentialite", "confidentialité", "rgpd"],
    response: "La plateforme sécurise vos données avec un **chiffrement de bout en bout** et une **authentification sécurisée par session**. Ne partagez jamais vos identifiants. BNA ne vous demandera jamais votre mot de passe par email ou téléphone. En cas de suspicion de fraude, contactez immédiatement votre agence.",
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
  "Je n'ai pas trouvé de réponse précise à votre question. Elle a été transmise à notre équipe qui y répondra prochainement. Vous pouvez aussi reformuler ou consulter « Documentation & types de crédit » après connexion.";

function getResponse(
  userText: string,
  dynamic: QARule[]
): { text: string; matched: boolean } {
  const normalized = normalize(userText);
  if (!normalized.trim()) return { text: FALLBACK, matched: false };
  const all = [...dynamic, ...QA];
  for (const { keywords, response } of all) {
    if (keywords.some((k) => normalized.includes(normalize(k))))
      return { text: response, matched: true };
  }
  return { text: FALLBACK, matched: false };
}

type RemoteQA = { id: string; keywords: string; response: string };

type AssistantChatProps = {
  compact?: boolean;
};

export default function AssistantChat({ compact = false }: AssistantChatProps) {
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [dynamicQA, setDynamicQA] = useState<QARule[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/assistant-qa")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: RemoteQA[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setDynamicQA(
            data.map((d) => ({
              keywords: d.keywords.split(",").map((k) => k.trim()).filter(Boolean),
              response: d.response,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendQuestion = useCallback((text: string) => {
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
    const { text: reply, matched } = getResponse(trimmed, dynamicQA);

    // If no match, silently report the question to the admin queue
    if (!matched) {
      fetch("/api/assistant-pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      }).catch(() => {});
    }

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
  }, [dynamicQA]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuestion(input);
  };

  return (
    <div className={`flex flex-col w-full ${compact ? "h-[460px]" : "h-[420px] max-w-2xl mx-auto"}`}>
      <div className={`flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 space-y-4 ${compact ? "mb-3" : "mb-4"} shadow-card`}>
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
