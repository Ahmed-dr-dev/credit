-- Credit Platform - Custom Auth Schema (no Supabase Auth)
-- Run this in Supabase SQL Editor (replaces profiles to use email + password_hash)

-- ============================================
-- 1. Enable UUID extension
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. Custom types (ENUMs)
-- ============================================
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'agent', 'client');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE demande_statut AS ENUM ('en_attente', 'en_cours_etude', 'en_attente_infos', 'validee', 'refusee');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE reclamation_statut AS ENUM ('en_attente', 'en_cours', 'traitee');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE document_statut AS ENUM ('en_attente', 'valide', 'refuse');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE rdv_statut AS ENUM ('demande', 'confirme', 'reporte', 'passe');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 3. Profiles (custom auth: email + password_hash)
-- ============================================
DROP TABLE IF EXISTS nouveautes CASCADE;
DROP TABLE IF EXISTS rendez_vous CASCADE;
DROP TABLE IF EXISTS reclamations CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS demandes CASCADE;
DROP TABLE IF EXISTS types_credit CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role app_role NOT NULL,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  telephone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. Types de crédit
-- ============================================
CREATE TABLE types_credit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  description TEXT,
  duree_max TEXT,
  montant_max TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. Demandes de crédit
-- ============================================
CREATE TABLE demandes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type_credit_id UUID REFERENCES types_credit(id) ON DELETE SET NULL,
  type_nom TEXT,
  montant TEXT NOT NULL,
  duree TEXT NOT NULL,
  statut demande_statut DEFAULT 'en_attente',
  responsable_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 6. Documents
-- ============================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  demande_id UUID NOT NULL REFERENCES demandes(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  fichier_url TEXT,
  statut document_statut DEFAULT 'en_attente',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 7. Réclamations
-- ============================================
CREATE TABLE reclamations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sujet TEXT NOT NULL,
  message TEXT NOT NULL,
  statut reclamation_statut DEFAULT 'en_attente',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 8. Rendez-vous
-- ============================================
CREATE TABLE rendez_vous (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  demande_id UUID REFERENCES demandes(id) ON DELETE SET NULL,
  date_demandee TIMESTAMPTZ,
  date_proposee TIMESTAMPTZ,
  statut rdv_statut DEFAULT 'demande',
  motif TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 9. Nouveautés
-- ============================================
CREATE TABLE nouveautes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  demande_id UUID REFERENCES demandes(id) ON DELETE SET NULL,
  titre TEXT NOT NULL,
  description TEXT,
  type_nouveaute TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 10. Indexes
-- ============================================
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_demandes_client ON demandes(client_id);
CREATE INDEX idx_demandes_responsable ON demandes(responsable_id);
CREATE INDEX idx_demandes_statut ON demandes(statut);
CREATE INDEX idx_documents_demande ON documents(demande_id);
CREATE INDEX idx_reclamations_client ON reclamations(client_id);
CREATE INDEX idx_rendez_vous_client ON rendez_vous(client_id);
CREATE INDEX idx_rendez_vous_agent ON rendez_vous(agent_id);
CREATE INDEX idx_nouveautes_client ON nouveautes(client_id);

-- ============================================
-- 11. updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER demandes_updated_at BEFORE UPDATE ON demandes FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER reclamations_updated_at BEFORE UPDATE ON reclamations FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER rendez_vous_updated_at BEFORE UPDATE ON rendez_vous FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ============================================
-- 12. Seed
-- ============================================
INSERT INTO types_credit (nom, description, duree_max, montant_max) VALUES
  ('Crédit à la consommation', 'Véhicule, équipement, travaux.', '84 mois', 'Selon profil'),
  ('Crédit immobilier', 'Achat ou construction immobilière.', '25-30 ans', 'Selon apport'),
  ('Crédit professionnel', 'Trésorerie, investissement entreprise.', 'Variable', 'Selon dossier');


