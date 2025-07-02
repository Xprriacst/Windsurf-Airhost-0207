-- Migration de la structure de production vers staging
-- Ce script doit être exécuté sur l'instance staging après sa création

-- =======================
-- 1. EXTENSIONS
-- =======================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =======================
-- 2. TABLES PRINCIPALES
-- =======================

-- Table des propriétés
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    description TEXT,
    host_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table des hôtes
CREATE TABLE IF NOT EXISTS hosts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table des conversations
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_name TEXT NOT NULL,
    guest_phone TEXT NOT NULL,
    property_id UUID REFERENCES properties(id),
    host_id UUID REFERENCES hosts(id),
    status TEXT DEFAULT 'active',
    check_in_date DATE,
    check_out_date DATE,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    unread_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Champs pour compatibilité avec l'existant
    property JSONB,
    guest_number TEXT
);

-- Table des messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('guest', 'host', 'system')),
    sender_id UUID,
    message_type TEXT DEFAULT 'text',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table des analyses de conversation (pour les tags d'urgence)
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

-- Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'emergency', 'mention', 'unread'
    title TEXT NOT NULL,
    content TEXT,
    priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =======================
-- 3. INDEXES POUR PERFORMANCE
-- =======================

-- Index pour les conversations
CREATE INDEX IF NOT EXISTS idx_conversations_host_id ON conversations(host_id);
CREATE INDEX IF NOT EXISTS idx_conversations_property_id ON conversations(property_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);

-- Index pour les messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);

-- Index pour les analyses
CREATE INDEX IF NOT EXISTS idx_analysis_conversation_id ON conversation_analysis(conversation_id);
CREATE INDEX IF NOT EXISTS idx_analysis_tag ON conversation_analysis(tag);
CREATE INDEX IF NOT EXISTS idx_analysis_needs_attention ON conversation_analysis(needs_attention);

-- Index pour les notifications
CREATE INDEX IF NOT EXISTS idx_notifications_conversation_id ON notifications(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- =======================
-- 4. FONCTIONS ET TRIGGERS
-- =======================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at 
    BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at 
    BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hosts_updated_at 
    BEFORE UPDATE ON hosts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =======================
-- 5. POLITIQUES RLS (Row Level Security)
-- =======================

-- Activer RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;

-- Politiques pour les conversations
CREATE POLICY "Users can view conversations where they are the host" 
    ON conversations FOR SELECT 
    USING (auth.uid() = host_id);

CREATE POLICY "Users can update conversations where they are the host" 
    ON conversations FOR UPDATE 
    USING (auth.uid() = host_id);

CREATE POLICY "Service role has full access to conversations" 
    ON conversations FOR ALL 
    USING (auth.role() = 'service_role');

-- Politiques pour les messages
CREATE POLICY "Users can view messages from their conversations" 
    ON messages FOR SELECT 
    USING (
        conversation_id IN (
            SELECT id FROM conversations WHERE host_id = auth.uid()
        )
    );

CREATE POLICY "Service role has full access to messages" 
    ON messages FOR ALL 
    USING (auth.role() = 'service_role');

-- Politiques pour les analyses
CREATE POLICY "Users can view analysis from their conversations" 
    ON conversation_analysis FOR SELECT 
    USING (
        conversation_id IN (
            SELECT id FROM conversations WHERE host_id = auth.uid()
        )
    );

CREATE POLICY "Service role has full access to analysis" 
    ON conversation_analysis FOR ALL 
    USING (auth.role() = 'service_role');

-- Politiques pour les notifications
CREATE POLICY "Users can view their notifications" 
    ON notifications FOR SELECT 
    USING (
        conversation_id IN (
            SELECT id FROM conversations WHERE host_id = auth.uid()
        )
    );

CREATE POLICY "Service role has full access to notifications" 
    ON notifications FOR ALL 
    USING (auth.role() = 'service_role');

-- Politiques pour les propriétés
CREATE POLICY "Users can view their properties" 
    ON properties FOR SELECT 
    USING (host_id = auth.uid());

CREATE POLICY "Service role has full access to properties" 
    ON properties FOR ALL 
    USING (auth.role() = 'service_role');

-- Politiques pour les hôtes
CREATE POLICY "Users can view their own host record" 
    ON hosts FOR SELECT 
    USING (id = auth.uid());

CREATE POLICY "Service role has full access to hosts" 
    ON hosts FOR ALL 
    USING (auth.role() = 'service_role');

-- =======================
-- 6. DONNÉES DE TEST (pour staging)
-- =======================

-- Insérer un hôte de test
INSERT INTO hosts (id, email, name, phone) 
VALUES (
    'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7',
    'contact.polaris.ia@gmail.com',
    'Host Test Staging',
    '+33123456789'
) ON CONFLICT (id) DO NOTHING;

-- Insérer une propriété de test
INSERT INTO properties (id, name, address, host_id) 
VALUES (
    '968070e6-e6ee-41d9-a3b0-c6365bff2097',
    'Appartement Test Staging',
    '123 Rue de Test, 75001 Paris',
    'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7'
) ON CONFLICT (id) DO NOTHING;

-- =======================
-- 7. VUES POUR FACILITER LES REQUÊTES
-- =======================

-- Vue des conversations avec leurs dernières analyses
CREATE OR REPLACE VIEW conversations_with_analysis AS
SELECT 
    c.*,
    ca.tag as last_analysis_tag,
    ca.confidence as last_analysis_confidence,
    ca.needs_attention,
    ca.analyzed_at as last_analyzed_at
FROM conversations c
LEFT JOIN LATERAL (
    SELECT * FROM conversation_analysis 
    WHERE conversation_id = c.id 
    ORDER BY analyzed_at DESC 
    LIMIT 1
) ca ON true;

-- Vue des messages avec analyses
CREATE OR REPLACE VIEW messages_with_analysis AS
SELECT 
    m.*,
    ca.tag,
    ca.confidence,
    ca.explanation,
    ca.needs_attention
FROM messages m
LEFT JOIN conversation_analysis ca ON ca.message_id = m.id;

-- =======================
-- RÉSUMÉ
-- =======================
-- Tables créées : 6
-- Index créés : 9  
-- Politiques RLS : 12
-- Vues créées : 2
-- Triggers créés : 4