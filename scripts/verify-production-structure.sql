-- Script de vérification de la structure de production
-- Exécuter sur l'instance de production pour identifier les éléments manquants

-- =======================
-- 1. VÉRIFICATION DES TABLES EXISTANTES
-- =======================
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- =======================
-- 2. VÉRIFICATION DE LA TABLE CONVERSATION_ANALYSIS
-- =======================
-- Vérifier si la table existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'conversation_analysis'
) as conversation_analysis_exists;

-- Structure de la table conversation_analysis si elle existe
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'conversation_analysis'
ORDER BY ordinal_position;

-- =======================
-- 3. VÉRIFICATION DES COLONNES MANQUANTES DANS CONVERSATIONS
-- =======================
-- Vérifier les colonnes existantes dans conversations
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'conversations'
ORDER BY ordinal_position;

-- =======================
-- 4. VÉRIFICATION DES INDEX
-- =======================
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN ('conversations', 'messages', 'conversation_analysis')
ORDER BY tablename, indexname;

-- =======================
-- 5. VÉRIFICATION DES POLITIQUES RLS
-- =======================
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =======================
-- 6. VÉRIFICATION DES TRIGGERS
-- =======================
SELECT 
    trigger_name,
    table_name,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY table_name, trigger_name;

-- =======================
-- 7. VÉRIFICATION DES EXTENSIONS
-- =======================
SELECT 
    extname as extension_name,
    extversion as version
FROM pg_extension;

-- =======================
-- 8. EXEMPLE DE DONNÉES CONVERSATION_ANALYSIS
-- =======================
-- Vérifier s'il y a des analyses existantes
SELECT 
    COUNT(*) as total_analyses,
    COUNT(DISTINCT conversation_id) as conversations_with_analysis,
    array_agg(DISTINCT tag) as existing_tags
FROM conversation_analysis
WHERE EXISTS (SELECT 1 FROM conversation_analysis LIMIT 1);

-- =======================
-- 9. STRUCTURE RECOMMANDÉE POUR CONVERSATION_ANALYSIS
-- =======================
/*
Si la table conversation_analysis n'existe pas, voici la structure recommandée :

CREATE TABLE conversation_analysis (
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

Index recommandés :
- idx_analysis_conversation_id
- idx_analysis_tag  
- idx_analysis_needs_attention

Tags de conversation supportés :
- 'Urgence critique'
- 'Client mécontent'
- 'IA incertaine'
- 'Intervention hôte requise'
- 'Escalade comportementale'
- 'Réponse connue'
*/