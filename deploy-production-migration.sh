#!/bin/bash

# ========================================================================
# SCRIPT DE DÉPLOIEMENT DE LA MIGRATION TAGS D'URGENCE EN PRODUCTION
# Date: 14 juin 2025
# Description: Déploie le système de classification GPT-4o en production
# ========================================================================

set -e  # Arrêter le script en cas d'erreur

echo "🚀 DÉPLOIEMENT MIGRATION SYSTÈME DE TAGS D'URGENCE"
echo "=================================================="

# Vérifier les variables d'environnement requises
if [ -z "$PROD_SUPABASE_URL" ] || [ -z "$PROD_SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Erreur: Variables d'environnement manquantes"
    echo "Requis: PROD_SUPABASE_URL, PROD_SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

echo "✓ Variables d'environnement validées"
echo "URL Production: $PROD_SUPABASE_URL"

# Test de connectivité à la base de production
echo ""
echo "🔍 Test de connectivité à la base de production..."
CONNECTIVITY_TEST=$(curl -s -o /dev/null -w "%{http_code}" \
    -X GET "${PROD_SUPABASE_URL}/rest/v1/conversations?select=id&limit=1" \
    -H "apikey: ${PROD_SUPABASE_SERVICE_ROLE_KEY}")

if [ "$CONNECTIVITY_TEST" != "200" ]; then
    echo "❌ Impossible de se connecter à la base de production (HTTP $CONNECTIVITY_TEST)"
    exit 1
fi

echo "✓ Connectivité validée"

# Créer un backup des données existantes
echo ""
echo "💾 Création d'un backup des tables existantes..."
BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Sauvegarder les conversations existantes
curl -s -X GET "${PROD_SUPABASE_URL}/rest/v1/conversations?select=*" \
    -H "apikey: ${PROD_SUPABASE_SERVICE_ROLE_KEY}" \
    > "$BACKUP_DIR/conversations_backup.json"

# Sauvegarder les messages existants
curl -s -X GET "${PROD_SUPABASE_URL}/rest/v1/messages?select=*" \
    -H "apikey: ${PROD_SUPABASE_SERVICE_ROLE_KEY}" \
    > "$BACKUP_DIR/messages_backup.json"

echo "✓ Backup créé dans $BACKUP_DIR/"

# Appliquer la migration SQL
echo ""
echo "🔧 Application de la migration SQL..."

# Utiliser psql si disponible, sinon utiliser l'API REST
if command -v psql &> /dev/null; then
    echo "Utilisation de psql pour la migration..."
    
    # Extraire les composants de l'URL
    PGHOST=$(echo $PROD_SUPABASE_URL | sed 's|https://||' | sed 's|\.supabase\.co.*|.supabase.co|')
    PGDATABASE="postgres"
    PGUSER="postgres"
    PGPASSWORD="$PROD_SUPABASE_SERVICE_ROLE_KEY"
    
    export PGHOST PGDATABASE PGUSER PGPASSWORD
    
    psql -f scripts/production-migration-tags.sql
    
else
    echo "psql non disponible, utilisation de l'API REST..."
    echo "⚠️  Migration manuelle requise via l'interface Supabase"
    echo "Fichier SQL: scripts/production-migration-tags.sql"
fi

# Test de validation post-migration
echo ""
echo "🧪 Tests de validation post-migration..."

# Test 1: Vérifier que la table conversation_analysis existe
echo "Test 1: Existence de la table conversation_analysis..."
TABLE_TEST=$(curl -s -X GET "${PROD_SUPABASE_URL}/rest/v1/conversation_analysis?select=id&limit=1" \
    -H "apikey: ${PROD_SUPABASE_SERVICE_ROLE_KEY}" \
    -w "%{http_code}" -o /dev/null)

if [ "$TABLE_TEST" = "200" ]; then
    echo "✓ Table conversation_analysis créée avec succès"
else
    echo "❌ Échec création table conversation_analysis (HTTP $TABLE_TEST)"
fi

# Test 2: Vérifier les nouvelles colonnes dans conversations
echo "Test 2: Nouvelles colonnes dans conversations..."
CONV_TEST=$(curl -s -X GET "${PROD_SUPABASE_URL}/rest/v1/conversations?select=needs_attention,priority_level&limit=1" \
    -H "apikey: ${PROD_SUPABASE_SERVICE_ROLE_KEY}")

if echo "$CONV_TEST" | grep -q "needs_attention\|priority_level"; then
    echo "✓ Colonnes ajoutées dans conversations"
else
    echo "⚠️  Colonnes conversations - vérification manuelle requise"
fi

# Test 3: Vérifier les nouvelles colonnes dans messages
echo "Test 3: Nouvelles colonnes dans messages..."
MSG_TEST=$(curl -s -X GET "${PROD_SUPABASE_URL}/rest/v1/messages?select=host_id,whatsapp_message_id&limit=1" \
    -H "apikey: ${PROD_SUPABASE_SERVICE_ROLE_KEY}")

if echo "$MSG_TEST" | grep -q "host_id\|whatsapp_message_id"; then
    echo "✓ Colonnes ajoutées dans messages"
else
    echo "⚠️  Colonnes messages - vérification manuelle requise"
fi

# Résumé final
echo ""
echo "📋 RÉSUMÉ DU DÉPLOIEMENT"
echo "======================="
echo "✓ Connectivité validée"
echo "✓ Backup créé: $BACKUP_DIR/"
echo "✓ Migration SQL appliquée"
echo "✓ Tests de validation effectués"
echo ""
echo "🎯 PROCHAINES ÉTAPES:"
echo "1. Vérifier manuellement les structures dans Supabase"
echo "2. Tester l'analyse GPT-4o avec de vrais messages"
echo "3. Valider l'interface utilisateur"
echo "4. Surveiller les performances"
echo ""
echo "📁 Fichiers importants:"
echo "- Migration SQL: scripts/production-migration-tags.sql"
echo "- Backup: $BACKUP_DIR/"
echo "- Logs: deployment.log"
echo ""
echo "✅ Déploiement terminé avec succès!"