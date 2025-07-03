#!/bin/bash

# Script de test automatisé pour la fonctionnalité de template WhatsApp
# Ce script teste l'envoi de templates selon la configuration de la base de données

FUNCTION_URL="https://whxkhrtlccxubvjgexmi.supabase.co/functions/v1/create-conversation-with-welcome"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeGtocnRsY2N4dWJ2amdleG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5OTc0MjEsImV4cCI6MjA2MzU3MzQyMX0.Bw3EecPS7gH61udufLAipWZGDbJzC2sb-D890w_iIds"
HOST_ID="a2ce1797-a5ab-4c37-9512-4a4058e0f1c7"
TEST_PHONE="+33784585116"

echo "🧪 Début des tests automatisés WhatsApp Template"
echo "================================================"

echo ""
echo "📝 Test 1: Vérification que le template n'est PAS envoyé quand désactivé"
echo "-----------------------------------------------------------------------"

# Nettoyer les conversations existantes
echo "🧹 Suppression des conversations existantes..."
supabase db execute "DELETE FROM conversations WHERE host_id = '$HOST_ID';" > /dev/null 2>&1

# Configurer template à false
echo "⚙️  Configuration du template à 'désactivé' dans la DB..."
curl -s -X PATCH "https://whxkhrtlccxubvjgexmi.supabase.co/rest/v1/whatsapp_template_config?host_id=eq.$HOST_ID" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -d '{"send_welcome_template": false}' > /dev/null 2>&1 || true

# Test avec template désactivé
echo "🚀 Envoi de la requête de création de conversation..."
RESPONSE_1=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "host_id": "'$HOST_ID'",
    "guest_name": "test1",
    "guest_phone": "'$TEST_PHONE'",
    "property_id": "968070e6-e6ee-41d9-a3b0-c6365bff2097",
    "check_in_date": "2025-06-21",
    "check_out_date": "2025-06-22",
    "send_welcome_template": true,
    "welcome_template_name": "hello_world"
  }')

echo "📤 Réponse de la fonction Edge:"
echo "$RESPONSE_1"

echo ""
echo "📝 Test 2: Vérification que le template EST envoyé quand activé"
echo "--------------------------------------------------------------"

# Nettoyer les conversations existantes
echo "🧹 Suppression des conversations existantes..."
supabase db execute "DELETE FROM conversations WHERE host_id = '$HOST_ID';" > /dev/null 2>&1

# Configurer template à true
echo "⚙️  Configuration du template à 'activé' dans la DB..."
curl -s -X PATCH "https://whxkhrtlccxubvjgexmi.supabase.co/rest/v1/whatsapp_template_config?host_id=eq.$HOST_ID" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -d '{"send_welcome_template": true}' > /dev/null 2>&1 || true

# Test avec template activé
echo "🚀 Envoi de la requête de création de conversation..."
RESPONSE_2=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "host_id": "'$HOST_ID'",
    "guest_name": "test1",
    "guest_phone": "'$TEST_PHONE'",
    "property_id": "968070e6-e6ee-41d9-a3b0-c6365bff2097",
    "check_in_date": "2025-06-21",
    "check_out_date": "2025-06-22",
    "send_welcome_template": true,
    "welcome_template_name": "hello_world"
  }')

echo "📤 Réponse de la fonction Edge:"
echo "$RESPONSE_2"

echo ""
echo "🔍 Analyse des résultats"
echo "========================"

# Analyser les réponses
echo "🔍 Analyse Test 1 (template désactivé):"
if echo "$RESPONSE_1" | grep -q '"template_sent":false'; then
    echo "✅ Test 1 RÉUSSI: Template non envoyé quand désactivé"
elif echo "$RESPONSE_1" | grep -q '"template_sent":true'; then
    echo "❌ Test 1 ÉCHOUÉ: Template envoyé malgré désactivation"
elif echo "$RESPONSE_1" | grep -q '"error"'; then
    echo "⚠️  Test 1 ERREUR: La fonction a retourné une erreur"
else
    echo "❓ Test 1 INCERTAIN: Réponse inattendue"
fi

echo "🔍 Analyse Test 2 (template activé):"
if echo "$RESPONSE_2" | grep -q '"template_sent":true'; then
    echo "✅ Test 2 RÉUSSI: Template envoyé quand activé"
elif echo "$RESPONSE_2" | grep -q '"template_sent":false'; then
    echo "❌ Test 2 ÉCHOUÉ: Template non envoyé malgré activation"
elif echo "$RESPONSE_2" | grep -q '"error"'; then
    echo "⚠️  Test 2 ERREUR: La fonction a retourné une erreur"
else
    echo "❓ Test 2 INCERTAIN: Réponse inattendue"
fi

echo ""
echo "✨ Tests terminés!"
