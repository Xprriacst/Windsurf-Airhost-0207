#!/bin/bash

# Test script pour valider que l'UI utilise correctement la nouvelle table whatsapp_template_config

# Configuration
HOST_ID="a2ce1797-a5ab-4c37-9512-4a4058e0f1c7"
SUPABASE_URL="https://xayiwvjswgqrnrgylwqg.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhheWl3dmpzd2dxcm5yZ3lsd3FnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1Njg2NDcsImV4cCI6MjA0ODE0NDY0N30.JG6DnKWBfzIrxZUWZYiT0iUZOhmxNFOCbTJ6ihUKokE"

echo "🧪 Test de validation de la configuration UI des templates WhatsApp"
echo "=================================================================="

# 1. Afficher l'état actuel de la configuration template
echo ""
echo "📊 État actuel de whatsapp_template_config:"
curl -s \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  "$SUPABASE_URL/rest/v1/whatsapp_template_config?host_id=eq.$HOST_ID&select=*" \
  | python3 -m json.tool

# 2. Tester l'activation du template
echo ""
echo "🔧 Test 1: Activation du template via simulation UI..."
curl -s \
  -X POST \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d "{
    \"host_id\": \"$HOST_ID\",
    \"send_welcome_template\": true,
    \"welcome_template_name\": \"hello_world\",
    \"auto_templates_enabled\": true,
    \"updated_at\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\"
  }" \
  "$SUPABASE_URL/rest/v1/whatsapp_template_config"

echo "✅ Template activé"

# 3. Vérifier l'état après activation
echo ""
echo "📊 État après activation:"
curl -s \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  "$SUPABASE_URL/rest/v1/whatsapp_template_config?host_id=eq.$HOST_ID&select=*" \
  | python3 -m json.tool

# 4. Tester la désactivation du template
echo ""
echo "🔧 Test 2: Désactivation du template via simulation UI..."
curl -s \
  -X POST \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d "{
    \"host_id\": \"$HOST_ID\",
    \"send_welcome_template\": false,
    \"welcome_template_name\": \"hello_world\",
    \"auto_templates_enabled\": false,
    \"updated_at\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\"
  }" \
  "$SUPABASE_URL/rest/v1/whatsapp_template_config"

echo "✅ Template désactivé"

# 5. Vérifier l'état final
echo ""
echo "📊 État final:"
curl -s \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  "$SUPABASE_URL/rest/v1/whatsapp_template_config?host_id=eq.$HOST_ID&select=*" \
  | python3 -m json.tool

echo ""
echo "🎉 Test de validation terminé!"
echo ""
echo "💡 Points à vérifier:"
echo "   - Le champ 'send_welcome_template' change correctement entre true/false"
echo "   - Le champ 'updated_at' est mis à jour à chaque modification"
echo "   - L'UI devrait maintenant lire et écrire dans cette table"
echo ""
echo "🚀 Prochaines étapes:"
echo "   - Tester l'interface utilisateur manuellement"
echo "   - Vérifier que le toggle persiste correctement"
echo "   - Valider avec le test de régression complet"
