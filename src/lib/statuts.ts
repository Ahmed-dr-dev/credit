export const DEMANDE_STATUTS: Record<string, string> = {
  en_attente: "En attente",
  en_cours_etude: "En cours d'étude",
  en_attente_infos: "En attente d'informations complémentaires",
  validee: "Validée",
  refusee: "Refusée",
};

export const RECLAMATION_STATUTS: Record<string, string> = {
  en_attente: "En attente",
  en_cours: "En cours",
  traitee: "Traitée",
};

export const DOCUMENT_STATUTS: Record<string, string> = {
  en_attente: "En attente",
  valide: "Validé",
  refuse: "Refusé",
};

export const RDV_STATUTS: Record<string, string> = {
  demande: "Demandé",
  alt_agent: "Alternative proposée (conseiller)",
  contre_client: "Contre-proposition (client)",
  confirme: "Confirmé",
  reporte: "Reporté",
  passe: "Passé",
};
