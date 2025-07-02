-- ========================================================================
-- MIGRATION SYSTÈME DE TAGS D'URGENCE POUR PRODUCTION
-- Date: 14 juin 2025
-- Description: Mise en place du système de classification GPT-4o
-- ========================================================================

-- Activer l'extension UUID si pas déjà fait
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================================================
-- 1. CRÉATION DE LA TABLE CONVERSATION_ANALYSIS
-- ========================================================================

-- Table principale pour les analyses GPT-4o et tags d'urgence
CREATE TABLE IF NOT EXISTS conversation_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    
    -- Analyse GPT-4o
    analysis_type TEXT NOT NULL CHECK (analysis_type IN ('emergency', 'sentiment', 'category')),
    tag TEXT NOT NULL CHECK (tag IN (
        'Urgence critique',
        'Client mécontent', 
        'IA incertaine',
        'Intervention hôte requise',
        'Escalade comportementale',
        'Réponse connue'
    )),
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    explanation TEXT,
    recommended_action TEXT,
    
    -- Gestion des urgences
    needs_attention BOOLEAN DEFAULT false,
    priority_level INTEGER DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 5),
    
    -- Métadonnées
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    analyzed_by TEXT DEFAULT 'gpt-4o',
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ========================================================================
-- 2. AMÉLIORATION DE LA TABLE MESSAGES
-- ========================================================================

-- Ajouter les colonnes manquantes dans messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES hosts(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_type TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT UNIQUE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS error_message TEXT;

-- ========================================================================
-- 3. AMÉLIORATION DE LA TABLE CONVERSATIONS
-- ========================================================================

-- Ajouter les colonnes pour synchronisation avec conversation_analysis
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_analysis_tag TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_analysis_confidence DECIMAL(3,2);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS needs_attention BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS priority_level INTEGER DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 5);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMP WITH TIME ZONE;

-- ========================================================================
-- 4. INDEX POUR OPTIMISATION DES PERFORMANCES
-- ========================================================================

-- Index pour conversation_analysis
CREATE INDEX IF NOT EXISTS idx_analysis_conversation_id ON conversation_analysis(conversation_id);
CREATE INDEX IF NOT EXISTS idx_analysis_tag ON conversation_analysis(tag);
CREATE INDEX IF NOT EXISTS idx_analysis_needs_attention ON conversation_analysis(needs_attention);
CREATE INDEX IF NOT EXISTS idx_analysis_priority_level ON conversation_analysis(priority_level DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_analyzed_at ON conversation_analysis(analyzed_at DESC);

-- Index pour conversations avec tags
CREATE INDEX IF NOT EXISTS idx_conversations_needs_attention ON conversations(needs_attention) WHERE needs_attention = true;
CREATE INDEX IF NOT EXISTS idx_conversations_priority_level ON conversations(priority_level DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_last_analyzed ON conversations(last_analyzed_at DESC);

-- Index pour messages améliorés
CREATE INDEX IF NOT EXISTS idx_messages_host_id ON messages(host_id);
CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_id ON messages(whatsapp_message_id);

-- ========================================================================
-- 5. FONCTIONS DE SYNCHRONISATION AUTOMATIQUE
-- ========================================================================

-- Fonction pour mettre à jour automatiquement les colonnes de conversations
CREATE OR REPLACE FUNCTION update_conversation_analysis()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour la conversation avec la dernière analyse
    UPDATE conversations 
    SET 
        last_analysis_tag = NEW.tag,
        last_analysis_confidence = NEW.confidence,
        needs_attention = NEW.needs_attention,
        priority_level = NEW.priority_level,
        last_analyzed_at = NEW.analyzed_at,
        updated_at = now()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour synchroniser automatiquement les analyses
DROP TRIGGER IF EXISTS trigger_update_conversation_analysis ON conversation_analysis;
CREATE TRIGGER trigger_update_conversation_analysis
    AFTER INSERT OR UPDATE ON conversation_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_analysis();

-- ========================================================================
-- 6. FONCTION DE CALCUL DE PRIORITÉ AUTOMATIQUE
-- ========================================================================

-- Fonction pour calculer automatiquement le niveau de priorité basé sur le tag
CREATE OR REPLACE FUNCTION calculate_priority_level(tag_value TEXT)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE tag_value
        WHEN 'Urgence critique' THEN 5
        WHEN 'Escalade comportementale' THEN 4
        WHEN 'Client mécontent' THEN 3
        WHEN 'Intervention hôte requise' THEN 3
        WHEN 'IA incertaine' THEN 2
        WHEN 'Réponse connue' THEN 1
        ELSE 1
    END;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calculer automatiquement la priorité
CREATE OR REPLACE FUNCTION auto_calculate_priority()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculer automatiquement le niveau de priorité si pas défini
    IF NEW.priority_level IS NULL OR NEW.priority_level = 1 THEN
        NEW.priority_level = calculate_priority_level(NEW.tag);
    END IF;
    
    -- Marquer comme nécessitant attention si priorité élevée
    IF NEW.priority_level >= 3 THEN
        NEW.needs_attention = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_calculate_priority ON conversation_analysis;
CREATE TRIGGER trigger_auto_calculate_priority
    BEFORE INSERT OR UPDATE ON conversation_analysis
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_priority();

-- ========================================================================
-- 7. SÉCURITÉ - ROW LEVEL SECURITY (RLS)
-- ========================================================================

-- Activer RLS sur conversation_analysis
ALTER TABLE conversation_analysis ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour conversation_analysis
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON conversation_analysis;
CREATE POLICY "Enable read access for authenticated users" 
ON conversation_analysis FOR SELECT 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON conversation_analysis;
CREATE POLICY "Enable insert access for authenticated users" 
ON conversation_analysis FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON conversation_analysis;
CREATE POLICY "Enable update access for authenticated users" 
ON conversation_analysis FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- ========================================================================
-- 8. VUES UTILITAIRES POUR REQUÊTES OPTIMISÉES
-- ========================================================================

-- Vue pour les conversations urgentes
CREATE OR REPLACE VIEW urgent_conversations AS
SELECT 
    c.*,
    ca.tag as current_tag,
    ca.confidence as current_confidence,
    ca.explanation as analysis_explanation,
    ca.analyzed_at as last_analysis_time
FROM conversations c
LEFT JOIN conversation_analysis ca ON c.id = ca.conversation_id
WHERE c.needs_attention = true 
   OR c.priority_level >= 3
ORDER BY c.priority_level DESC, c.last_message_at DESC;

-- Vue pour statistiques des tags
CREATE OR REPLACE VIEW tag_statistics AS
SELECT 
    tag,
    COUNT(*) as total_count,
    COUNT(DISTINCT conversation_id) as unique_conversations,
    AVG(confidence) as avg_confidence,
    COUNT(CASE WHEN needs_attention THEN 1 END) as attention_needed,
    MAX(analyzed_at) as last_seen
FROM conversation_analysis
WHERE analyzed_at >= NOW() - INTERVAL '30 days'
GROUP BY tag
ORDER BY total_count DESC;

-- ========================================================================
-- 9. FONCTION DE TEST ET VALIDATION
-- ========================================================================

-- Fonction de test pour valider la migration
CREATE OR REPLACE FUNCTION test_emergency_system()
RETURNS TABLE(
    test_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Test 1: Vérifier que la table existe
    RETURN QUERY
    SELECT 
        'Table conversation_analysis exists'::TEXT,
        CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'conversation_analysis') 
             THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Table structure verification'::TEXT;
    
    -- Test 2: Vérifier les colonnes obligatoires
    RETURN QUERY
    SELECT 
        'Required columns exist'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'conversation_analysis' 
            AND column_name IN ('tag', 'confidence', 'needs_attention', 'priority_level')
            GROUP BY table_name
            HAVING COUNT(*) = 4
        ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Column structure verification'::TEXT;
    
    -- Test 3: Vérifier les contraintes de tag
    RETURN QUERY
    SELECT 
        'Tag constraints valid'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.check_constraints 
            WHERE constraint_name LIKE '%tag%'
        ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Tag enumeration constraints'::TEXT;
    
    -- Test 4: Vérifier les triggers
    RETURN QUERY
    SELECT 
        'Triggers created'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'trigger_update_conversation_analysis'
        ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Trigger functionality'::TEXT;
    
    -- Test 5: Vérifier les vues
    RETURN QUERY
    SELECT 
        'Views created'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.views 
            WHERE table_name IN ('urgent_conversations', 'tag_statistics')
            GROUP BY 1
            HAVING COUNT(*) = 2
        ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Utility views availability'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- 10. NETTOYAGE ET FINALISATION
-- ========================================================================

-- Nettoyer les ancienne données de test si elles existent
DELETE FROM conversation_analysis WHERE analyzed_by = 'test' OR explanation LIKE '%test%';

-- Mettre à jour les statistiques de la base
ANALYZE conversation_analysis;
ANALYZE conversations;
ANALYZE messages;

-- ========================================================================
-- RÉSUMÉ DE LA MIGRATION
-- ========================================================================

/*
Cette migration ajoute le système complet de tags d'urgence GPT-4o:

✅ Tables créées:
   - conversation_analysis (table principale des analyses)

✅ Colonnes ajoutées:
   - messages: host_id, media_url, media_type, whatsapp_message_id, error_message
   - conversations: last_analysis_tag, last_analysis_confidence, needs_attention, priority_level, last_analyzed_at

✅ Fonctionnalités:
   - Classification automatique en 6 catégories
   - Synchronisation temps réel conversations ↔ analyses
   - Calcul automatique des priorités
   - Vues optimisées pour requêtes urgentes
   - Sécurité RLS activée

✅ Performance:
   - 8 index créés pour optimiser les requêtes
   - Triggers efficaces pour synchronisation
   - Vues précalculées pour dashboard

Pour tester la migration:
SELECT * FROM test_emergency_system();
*/