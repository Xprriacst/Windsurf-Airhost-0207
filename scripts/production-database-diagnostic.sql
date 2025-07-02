-- ===================================================================
-- DIAGNOSTIC COMPLET - BASE DE DONNÉES PRODUCTION AIRHOST
-- ===================================================================
-- Exécutez ce script sur votre base de production pour analyser la structure
-- Copiez-collez tous les résultats pour que je puisse créer le script de migration
-- ===================================================================

-- =======================
-- 1. VÉRIFICATION DES TABLES EXISTANTES
-- =======================
SELECT '=== TABLES EXISTANTES ===' as section;

SELECT 
    table_name,
    table_type,
    'Table trouvée' as status
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- =======================
-- 2. STRUCTURE DE LA TABLE CONVERSATIONS
-- =======================
SELECT '=== STRUCTURE TABLE CONVERSATIONS ===' as section;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'conversations'
ORDER BY ordinal_position;

-- =======================
-- 3. STRUCTURE DE LA TABLE MESSAGES
-- =======================
SELECT '=== STRUCTURE TABLE MESSAGES ===' as section;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'messages'
ORDER BY ordinal_position;

-- =======================
-- 4. VÉRIFICATION TABLE CONVERSATION_ANALYSIS
-- =======================
SELECT '=== VÉRIFICATION CONVERSATION_ANALYSIS ===' as section;

SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'conversation_analysis'
) as table_exists;

-- Structure si elle existe
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
-- 5. VÉRIFICATION TABLE HOSTS
-- =======================
SELECT '=== STRUCTURE TABLE HOSTS ===' as section;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'hosts'
ORDER BY ordinal_position;

-- =======================
-- 6. VÉRIFICATION DES CLÉS ÉTRANGÈRES
-- =======================
SELECT '=== CLÉS ÉTRANGÈRES EXISTANTES ===' as section;

SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- =======================
-- 7. VÉRIFICATION DES INDEX
-- =======================
SELECT '=== INDEX EXISTANTS ===' as section;

SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- =======================
-- 8. VÉRIFICATION DES EXTENSIONS
-- =======================
SELECT '=== EXTENSIONS INSTALLÉES ===' as section;

SELECT 
    extname as extension_name,
    extversion as version
FROM pg_extension;

-- =======================
-- 9. ÉCHANTILLON DE DONNÉES CONVERSATIONS
-- =======================
SELECT '=== ÉCHANTILLON CONVERSATIONS ===' as section;

SELECT 
    COUNT(*) as total_conversations,
    MIN(created_at) as oldest_conversation,
    MAX(created_at) as newest_conversation
FROM conversations;

-- Échantillon de structure
SELECT 
    id,
    guest_name,
    guest_phone,
    CASE 
        WHEN length(last_message) > 50 
        THEN substring(last_message from 1 for 50) || '...'
        ELSE last_message 
    END as last_message_preview,
    last_message_at,
    status
FROM conversations 
ORDER BY last_message_at DESC 
LIMIT 3;

-- =======================
-- 10. VÉRIFICATION COLONNES TAGS EXISTANTES
-- =======================
SELECT '=== VÉRIFICATION COLONNES TAGS ===' as section;

SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'conversations'
AND column_name IN ('last_analysis_tag', 'needs_attention', 'priority_level', 'last_analyzed_at')
ORDER BY column_name;

-- =======================
-- 11. VÉRIFICATION POLITIQUES RLS
-- =======================
SELECT '=== POLITIQUES RLS ACTIVES ===' as section;

SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =======================
-- RÉSUMÉ POUR MIGRATION
-- =======================
SELECT '=== RÉSUMÉ ===' as section;

SELECT 
    'Production diagnostic terminé - envoyez ces résultats pour créer la migration' as status,
    now() as diagnostic_time;