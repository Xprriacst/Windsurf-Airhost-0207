-- CORRECTION TRIGGER PRODUCTION POUR SYSTÈME DE TAGS
-- À exécuter dans Supabase SQL Editor

-- Corriger la fonction trigger sans référence à updated_at
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
        last_analyzed_at = NEW.analyzed_at
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recréer le trigger
DROP TRIGGER IF EXISTS trigger_update_conversation_analysis ON conversation_analysis;
CREATE TRIGGER trigger_update_conversation_analysis
    AFTER INSERT OR UPDATE ON conversation_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_analysis();

-- Validation du système
SELECT 'Trigger corrigé avec succès' as status;