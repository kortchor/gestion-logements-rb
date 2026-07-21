-- Migration: Ajouter les colonnes Yousign à la table baux
-- Date: 2026-07-21

-- Ajouter les colonnes si elles n'existent pas
ALTER TABLE baux
ADD COLUMN IF NOT EXISTS yousign_request_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS signature_status VARCHAR(50) DEFAULT 'pending';

-- Créer un index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_baux_yousign_request_id ON baux(yousign_request_id);

-- Ajouter un commentaire pour documenter les colonnes
COMMENT ON COLUMN baux.yousign_request_id IS 'ID de la demande de signature Yousign';
COMMENT ON COLUMN baux.signature_status IS 'Statut de la signature (pending, completed, expired, cancelled)';
