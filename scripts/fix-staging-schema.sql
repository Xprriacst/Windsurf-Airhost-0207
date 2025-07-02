-- Script de correction pour l'instance staging
-- Ajoute la colonne host_id manquante et synchronise avec production

-- =======================
-- 1. AJOUTER LA COLONNE host_id
-- =======================
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES hosts(id);

-- =======================
-- 2. VÉRIFIER ET CRÉER INDEX SI NÉCESSAIRE
-- =======================
CREATE INDEX IF NOT EXISTS idx_conversations_host_id ON conversations(host_id);

-- =======================
-- 3. MISE À JOUR DES POLITIQUES RLS SI NÉCESSAIRE
-- =======================
-- Vérifier si les politiques existent déjà
DO $$
BEGIN
    -- Politique pour les conversations avec host_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'conversations' 
        AND policyname = 'Users can view conversations for their hosts'
    ) THEN
        CREATE POLICY "Users can view conversations for their hosts"
        ON conversations FOR SELECT
        USING (
            host_id IN (
                SELECT id FROM hosts WHERE user_id = auth.uid()
            )
        );
    END IF;
END
$$;

-- =======================
-- 4. VALEURS PAR DÉFAUT POUR LES DONNÉES EXISTANTES
-- =======================
-- Si il y a des conversations sans host_id, les associer au premier host disponible
UPDATE conversations 
SET host_id = (SELECT id FROM hosts LIMIT 1)
WHERE host_id IS NULL
AND EXISTS (SELECT 1 FROM hosts);

-- =======================
-- 5. VÉRIFICATION FINALE
-- =======================
-- Vérifier que la colonne existe maintenant
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'conversations'
AND column_name = 'host_id';

-- Compter les conversations avec/sans host_id
SELECT 
    COUNT(*) as total_conversations,
    COUNT(host_id) as conversations_with_host_id,
    COUNT(*) - COUNT(host_id) as conversations_without_host_id
FROM conversations;

-- =======================
-- 6. STRUCTURE COMPLÈTE conversation_analysis
-- =======================
-- S'assurer que la table conversation_analysis a la bonne structure
CREATE TABLE IF NOT EXISTS conversation_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL, -- 'emergency', 'sentiment', 'category'
    tag TEXT NOT NULL, -- 'Urgence critique', 'Client mécontent', etc.
    confidence DECIMAL(3,2), -- 0.00 à 1.00
    explanation TEXT,
    recommended_action TEXT,
    needs_attention BOOLEAN DEFAULT false,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    analyzed_by TEXT DEFAULT 'gpt-4o'
);

-- Index pour conversation_analysis
CREATE INDEX IF NOT EXISTS idx_analysis_conversation_id ON conversation_analysis(conversation_id);
CREATE INDEX IF NOT EXISTS idx_analysis_tag ON conversation_analysis(tag);
CREATE INDEX IF NOT EXISTS idx_analysis_needs_attention ON conversation_analysis(needs_attention);

-- =======================
-- RÉSULTAT
-- =======================
SELECT 'Migration staging terminée avec succès' as status;