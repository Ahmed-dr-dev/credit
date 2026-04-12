-- Paramètres système BNA Crédit
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.parametres (
  cle         TEXT PRIMARY KEY,
  valeur      TEXT NOT NULL,
  label       TEXT NOT NULL,
  unite       TEXT NOT NULL DEFAULT '',
  groupe      TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.parametres ENABLE ROW LEVEL SECURITY;
-- Access via service role (API routes with admin auth check)

-- Seed default values
INSERT INTO public.parametres (cle, valeur, label, unite, groupe, description) VALUES
  ('taux_immobilier',         '7.5',   'Taux d''intérêt — Crédit immobilier',         '%',    'taux',    'Taux annuel appliqué aux crédits immobiliers.'),
  ('taux_consommation',       '12',    'Taux d''intérêt — Crédit à la consommation',  '%',    'taux',    'Taux annuel appliqué aux crédits à la consommation.'),
  ('taux_professionnel',      '9',     'Taux d''intérêt — Crédit professionnel',      '%',    'taux',    'Taux annuel appliqué aux crédits professionnels.'),
  ('duree_max_immobilier',    '360',   'Durée max — Crédit immobilier',               'mois', 'duree',   'Durée maximale accordée (en mois).'),
  ('duree_max_consommation',  '84',    'Durée max — Crédit à la consommation',        'mois', 'duree',   'Durée maximale accordée (en mois).'),
  ('duree_max_professionnel', '120',   'Durée max — Crédit professionnel',            'mois', 'duree',   'Durée maximale accordée (en mois).'),
  ('montant_max_immobilier',  '500000','Montant max — Crédit immobilier',             'DT',   'montant', 'Montant maximum finançable.'),
  ('montant_max_consommation','50000', 'Montant max — Crédit à la consommation',      'DT',   'montant', 'Montant maximum finançable.'),
  ('montant_max_professionnel','300000','Montant max — Crédit professionnel',         'DT',   'montant', 'Montant maximum finançable.'),
  ('frais_dossier',           '1',     'Frais de dossier',                            '%',    'frais',   'Pourcentage du montant emprunté (frais de traitement).'),
  ('apport_min_immobilier',   '10',    'Apport minimum — Immobilier',                 '%',    'frais',   'Apport personnel minimum requis pour le crédit immobilier.'),
  ('assurance_taux',          '0.3',   'Taux d''assurance emprunteur',                '%/an', 'frais',   'Taux annuel de l''assurance emprunteur (décès/invalidité).')
ON CONFLICT (cle) DO NOTHING;
