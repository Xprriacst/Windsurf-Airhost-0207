-- ========================================
-- MIGRATION COMPLÈTE PRODUCTION - TABLES MANQUANTES
-- ========================================

-- Table conversation_analysis pour analyses détaillées GPT-4o
CREATE TABLE IF NOT EXISTS conversation_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50) NOT NULL DEFAULT 'emergency',
  tag VARCHAR(100) NOT NULL,
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0.5,
  explanation TEXT,
  recommended_action TEXT,
  needs_attention BOOLEAN DEFAULT false,
  priority_level INTEGER DEFAULT 1,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_conversation_analysis_conversation_id ON conversation_analysis(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_analysis_tag ON conversation_analysis(tag);
CREATE INDEX IF NOT EXISTS idx_conversation_analysis_priority ON conversation_analysis(priority_level);

-- Table conversation_tags pour gestion avancée des tags
CREATE TABLE IF NOT EXISTS conversation_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  priority_level INTEGER NOT NULL DEFAULT 1,
  color_code VARCHAR(7) DEFAULT '#808080',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertion des tags standards du système d'urgence
INSERT INTO conversation_tags (name, category, priority_level, color_code, description) VALUES
('Urgence critique', 'emergency', 5, '#FF0000', 'Situation d''urgence nécessitant une intervention immédiate'),
('Escalade comportementale', 'behavioral', 4, '#FF4500', 'Comportement agressif ou menaçant du client'),
('Client mécontent', 'satisfaction', 3, '#FFA500', 'Client insatisfait nécessitant attention particulière'),
('Intervention hôte requise', 'operational', 3, '#FFD700', 'Problème nécessitant l''intervention directe de l''hôte'),
('IA incertaine', 'analysis', 2, '#87CEEB', 'Analyse IA peu fiable, vérification humaine recommandée'),
('Réponse connue', 'standard', 1, '#90EE90', 'Situation standard avec réponse type disponible')
ON CONFLICT (name) DO NOTHING;

-- Fonction calculate_priority_level pour automatiser les priorités
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
    ELSE 2
  END;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour synchroniser conversation_analysis avec conversations
CREATE OR REPLACE FUNCTION sync_conversation_from_analysis()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE conversations 
    SET 
      emergency_status = CASE NEW.tag
        WHEN 'Urgence critique' THEN 'critical'
        WHEN 'Escalade comportementale' THEN 'escalation'
        WHEN 'Client mécontent' THEN 'dissatisfied'
        ELSE 'normal'
      END,
      priority_level = NEW.priority_level,
      ai_analysis_type = 'gpt4o',
      needs_attention = NEW.needs_attention,
      analysis_confidence = NEW.confidence,
      analysis_timestamp = NEW.analyzed_at
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS sync_conversation_analysis_trigger ON conversation_analysis;
CREATE TRIGGER sync_conversation_analysis_trigger
    AFTER INSERT OR UPDATE ON conversation_analysis
    FOR EACH ROW
    EXECUTE FUNCTION sync_conversation_from_analysis();

-- Table messages pour historique complet des conversations
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('guest', 'host', 'system')),
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  whatsapp_message_id VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_id ON messages(whatsapp_message_id);

-- Vue pour faciliter les requêtes avec analyses
CREATE OR REPLACE VIEW conversations_with_analysis AS
SELECT 
  c.*,
  ca.tag as current_analysis_tag,
  ca.confidence as analysis_confidence,
  ca.explanation as analysis_explanation,
  ca.needs_attention,
  ca.analyzed_at
FROM conversations c
LEFT JOIN LATERAL (
  SELECT * FROM conversation_analysis 
  WHERE conversation_id = c.id 
  ORDER BY analyzed_at DESC 
  LIMIT 1
) ca ON true;

-- Mise à jour des conversations existantes avec les nouvelles données
UPDATE conversations 
SET 
  emergency_status = 'critical',
  ai_analysis_type = 'gpt4o',
  needs_attention = true,
  analysis_confidence = 0.95,
  analysis_timestamp = NOW()
WHERE guest_name IN ('Thomas Leroy', 'Lucie Bernard');

UPDATE conversations 
SET 
  emergency_status = 'normal',
  ai_analysis_type = 'gpt4o',
  needs_attention = false,
  analysis_confidence = 0.70,
  analysis_timestamp = NOW()
WHERE guest_name = 'Marc Dubois';

-- Insérer les analyses correspondantes dans conversation_analysis
INSERT INTO conversation_analysis (conversation_id, tag, confidence, explanation, needs_attention, priority_level)
SELECT 
  id,
  CASE 
    WHEN guest_name = 'Thomas Leroy' THEN 'Urgence critique'
    WHEN guest_name = 'Lucie Bernard' THEN 'Urgence critique'
    ELSE 'Réponse connue'
  END,
  CASE 
    WHEN guest_name IN ('Thomas Leroy', 'Lucie Bernard') THEN 0.95
    ELSE 0.70
  END,
  'Analyse automatique basée sur le contenu du message',
  CASE 
    WHEN guest_name IN ('Thomas Leroy', 'Lucie Bernard') THEN true
    ELSE false
  END,
  CASE 
    WHEN guest_name IN ('Thomas Leroy', 'Lucie Bernard') THEN 5
    ELSE 1
  END
FROM conversations 
WHERE guest_name IN ('Thomas Leroy', 'Lucie Bernard', 'Marc Dubois')
ON CONFLICT DO NOTHING;

COMMIT;