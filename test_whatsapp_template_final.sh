#!/bin/bash

# Script de test de régression pour le toggle des templates WhatsApp
# Ce script valide que la fonction Edge vérifie correctement l'état persisté
# dans la base de données plutôt que de faire confiance au payload de la requête

set -e

# Configuration
HOST_ID="a2ce1797-a5ab-4c37-9512-4a4058e0f1c7"
GUEST_PHONE="+33784585116"
PROPERTY_ID="968070e6-e6ee-41d9-a3b0-c6365bff2097"
SUPABASE_URL="https://whxkhrtlccxubvjgexmi.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeGtocnRsY2N4dWJ2amdleG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5OTc0MjEsImV4cCI6MjA2MzU3MzQyMX0.Bw3EecPS7gH61udufLAipWZGDbJzC2sb-D890w_iIds"

echo "🧪 Test de Régression - WhatsApp Template Toggle"
echo "==============================================="
echo ""

# Fonction pour supprimer les conversations de test
delete_test_conversations() {
    echo "🧹 Suppression des conversations de test..."
    # Utiliser supabase CLI comme dans la documentation (méthode qui fonctionnait)
    supabase sql --execute "DELETE FROM conversations WHERE host_id = '$HOST_ID' AND guest_phone = '$GUEST_PHONE';" > /dev/null 2>&1 || true
    
    # Attendre un peu pour que la suppression soit effective
    sleep 1
}

# Fonction pour configurer le toggle des templates
set_template_toggle() {
    local enabled=$1
    echo "⚙️  Configuration du template à '$enabled' dans la DB..."
    # Utiliser l'API REST pour mettre à jour la configuration
    curl -s -X PATCH \
        -H "apikey: $ANON_KEY" \
        -H "Authorization: Bearer $ANON_KEY" \
        -H "Content-Type: application/json" \
        -H "Prefer: resolution=merge-duplicates" \
        -d "{\"send_welcome_template\": $enabled, \"updated_at\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\"}" \
        "$SUPABASE_URL/rest/v1/whatsapp_template_config?host_id=eq.$HOST_ID" > /dev/null 2>&1 || true
    
    # Attendre un peu pour que la mise à jour soit effective
    sleep 1
}

# Fonction pour tester la création de conversation
test_conversation_creation() {
    local test_name=$1
    local expected_template_sent=$2
    
    echo "🚀 Test: $test_name"
    echo "   Envoi de la requête de création de conversation..."
    
    RESPONSE=$(curl -s -X POST "$SUPABASE_URL/functions/v1/create-conversation-with-welcome" \
        -H "Authorization: Bearer $ANON_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "host_id": "'$HOST_ID'",
            "guest_name": "test1",
            "guest_phone": "'$GUEST_PHONE'",
            "property_id": "'$PROPERTY_ID'",
            "check_in_date": "2025-06-21",
            "check_out_date": "2025-06-22",
            "send_welcome_template": true,
            "welcome_template_name": "hello_world"
        }')
    
    echo "   Réponse: $RESPONSE"
    
    # Analyser la réponse
    if echo "$RESPONSE" | grep -q "\"welcome_template_sent\":$expected_template_sent"; then
        echo "   ✅ TEST RÉUSSI: Template comportement attendu ($expected_template_sent)"
        return 0
    else
        echo "   ❌ TEST ÉCHOUÉ: Comportement inattendu (attendu: $expected_template_sent)"
        return 1
    fi
}

# Test 1: Template désactivé
echo "📝 Test 1: Vérification que le template n'est PAS envoyé quand désactivé"
echo "-----------------------------------------------------------------------"
delete_test_conversations
set_template_toggle "false"
test_1_result=0
test_conversation_creation "Template désactivé" "false" || test_1_result=1

echo ""

# Test 2: Template activé
echo "📝 Test 2: Vérification que le template EST envoyé quand activé"
echo "--------------------------------------------------------------"
delete_test_conversations
set_template_toggle "true"
test_2_result=0
test_conversation_creation "Template activé" "true" || test_2_result=1

echo ""
echo "🔍 Résumé des Tests"
echo "==================="

if [ $test_1_result -eq 0 ]; then
    echo "✅ Test 1 RÉUSSI: Template correctement désactivé"
else
    echo "❌ Test 1 ÉCHOUÉ: Template envoyé malgré désactivation"
fi

if [ $test_2_result -eq 0 ]; then
    echo "✅ Test 2 RÉUSSI: Template correctement activé"
else
    echo "❌ Test 2 ÉCHOUÉ: Template non envoyé malgré activation"
fi

echo ""

if [ $test_1_result -eq 0 ] && [ $test_2_result -eq 0 ]; then
    echo "🎉 TOUS LES TESTS RÉUSSIS: Le fix du toggle des templates fonctionne correctement!"
    exit 0
else
    echo "⚠️  CERTAINS TESTS ONT ÉCHOUÉ: Vérifier la logique du toggle des templates"
    exit 1
fi
