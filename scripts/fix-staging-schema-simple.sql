-- Script de correction simplifié pour l'instance staging
-- Ajoute uniquement la colonne host_id manquante

-- =======================
-- 1. AJOUTER LA COLONNE host_id
-- =======================
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES hosts(id);

-- =======================
-- 2. CRÉER INDEX
-- =======================
CREATE INDEX IF NOT EXISTS idx_conversations_host_id ON conversations(host_id);

-- =======================
-- 3. ASSOCIER LES CONVERSATIONS EXISTANTES À UN HOST
-- =======================
-- Mettre à jour les conversations sans host_id
UPDATE conversations 
SET host_id = (SELECT id FROM hosts LIMIT 1)
WHERE host_id IS NULL
AND EXISTS (SELECT 1 FROM hosts);

-- =======================
-- 4. VÉRIFICATION
-- =======================
-- Vérifier que la colonne existe
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'conversations'
AND column_name = 'host_id';

-- Compter les conversations
SELECT 
    COUNT(*) as total_conversations,
    COUNT(host_id) as conversations_with_host_id
FROM conversations;

-- =======================
-- 5. S'ASSURER QUE conversation_analysis EXISTE
-- =======================
CREATE TABLE IF NOT EXISTS conversation_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL,
    tag TEXT NOT NULL,
    confidence DECIMAL(3,2),
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

SELECT 'Migration staging terminée avec succès' as status;