-- CORRECTION FINALE DU TRIGGER PRODUCTION
-- Enlever toute référence à updated_at qui n'existe pas

-- 1. Supprimer le trigger existant
DROP TRIGGER IF EXISTS trigger_update_conversation_analysis ON conversation_analysis;

-- 2. Corriger la fonction sans référence à updated_at
CREATE OR REPLACE FUNCTION update_conversation_analysis()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour seulement les colonnes qui existent
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

-- 3. Recréer le trigger
CREATE TRIGGER trigger_update_conversation_analysis
    AFTER INSERT OR UPDATE ON conversation_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_analysis();

-- 4. Test d'insertion pour vérifier
INSERT INTO conversation_analysis (
    conversation_id,
    analysis_type,
    tag,
    confidence,
    explanation,
    needs_attention,
    priority_level,
    analyzed_at
) 
SELECT 
    id,
    'emergency',
    'Urgence critique',
    0.98,
    'Test correction trigger final - ' || NOW()::text,
    true,
    5,
    NOW()
FROM conversations 
WHERE guest_name IS NOT NULL
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- 5. Vérifier que le trigger a fonctionné
SELECT 
    'Trigger Status: ' || 
    CASE 
        WHEN COUNT(*) > 0 THEN 'FONCTIONNEL ✅'
        ELSE 'ERREUR ❌'
    END as status
FROM conversations 
WHERE last_analysis_tag = 'Urgence critique' 
  AND needs_attention = true 
  AND priority_level = 5;