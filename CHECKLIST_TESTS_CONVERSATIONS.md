# Checklist Tests - Système de Création de Conversations

## Configuration Préalable

### ✅ Vérifier la Configuration WhatsApp
```bash
node check-whatsapp-config.js
```
**Résultat attendu :**
- Configuration trouvée avec Phone Number ID: 256414537555113
- Token présent dans la base de données

### ✅ Vérifier les Services Actifs
```bash
# Vérifier que les services sont démarrés
curl http://localhost:3002/health
curl http://localhost:3001/webhook/whatsapp
```

---

## Tests de Création de Conversations

### Test 1: Service Local - SANS Template
```bash
curl -X POST http://localhost:3002/create-conversation \
  -H "Content-Type: application/json" \
  -d '{
    "host_id": "a2ce1797-a5ab-4c37-9512-4a4058e0f1c7",
    "property_id": "a0624296-4e92-469c-9be2-dcbe8ff547c2",
    "guest_name": "Test Sans Template",
    "guest_phone": "+33617370410",
    "check_in_date": "2025-09-01",
    "check_out_date": "2025-09-05",
    "send_welcome_template": false
  }'
```

**Résultat attendu :**
- ✅ Conversation créée avec succès
- ✅ `welcome_template_sent: false`
- ✅ Pas d'erreur de template

### Test 2: Service Local - AVEC Template
```bash
curl -X POST http://localhost:3002/create-conversation \
  -H "Content-Type: application/json" \
  -d '{
    "host_id": "a2ce1797-a5ab-4c37-9512-4a4058e0f1c7",
    "property_id": "a0624296-4e92-469c-9be2-dcbe8ff547c2",
    "guest_name": "Test Avec Template",
    "guest_phone": "+33617370411",
    "check_in_date": "2025-09-10",
    "check_out_date": "2025-09-15",
    "send_welcome_template": true,
    "welcome_template_name": "hello_world"
  }'
```

**Résultat attendu :**
- ✅ Conversation créée avec succès
- ✅ Configuration WhatsApp récupérée depuis la base
- ⚠️ `welcome_template_sent: false` (normal sans token API valide)
- ⚠️ Erreur template explicite si token manquant

### Test 3: Edge Function - SANS Template
```bash
curl -X POST https://whxkhrtlccxubvjgexmi.supabase.co/functions/v1/create-conversation-with-welcome \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d '{
    "host_id": "a2ce1797-a5ab-4c37-9512-4a4058e0f1c7",
    "property_id": "a0624296-4e92-469c-9be2-dcbe8ff547c2",
    "guest_name": "Test Edge Sans Template",
    "guest_phone": "+33617370412",
    "check_in_date": "2025-09-20",
    "check_out_date": "2025-09-25",
    "send_welcome_template": false
  }'
```

**Résultat attendu :**
- ✅ Conversation créée avec succès
- ✅ `welcome_template_sent: false`
- ✅ Pas d'erreur de template

### Test 4: Edge Function - AVEC Template
```bash
curl -X POST https://whxkhrtlccxubvjgexmi.supabase.co/functions/v1/create-conversation-with-welcome \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d '{
    "host_id": "a2ce1797-a5ab-4c37-9512-4a4058e0f1c7",
    "property_id": "a0624296-4e92-469c-9be2-dcbe8ff547c2",
    "guest_name": "Test Edge Avec Template",
    "guest_phone": "+33617370413",
    "check_in_date": "2025-10-01",
    "check_out_date": "2025-10-05",
    "send_welcome_template": true,
    "welcome_template_name": "hello_world"
  }'
```

**Résultat attendu :**
- ✅ Conversation créée avec succès
- ✅ Configuration WhatsApp récupérée depuis la base
- ⚠️ `welcome_template_sent: false` (normal sans token API valide)
- ⚠️ Erreur template explicite si token manquant

---

## Tests de Validation de Configuration

### Test 5: Vérifier Configuration Base de Données
```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

supabase.from('whatsapp_config')
  .select('phone_number_id, token')
  .order('updated_at', { ascending: false })
  .limit(1)
  .single()
  .then(({ data, error }) => {
    if (error) console.log('❌ Erreur config:', error);
    else console.log('✅ Config trouvée:', { 
      phone_number_id: data.phone_number_id,
      token_present: !!data.token 
    });
  });
"
```

**Résultat attendu :**
- ✅ Configuration trouvée
- ✅ Phone Number ID: 256414537555113
- ✅ Token présent: true

### Test 6: Vérifier Conversations Créées
```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

supabase.from('conversations')
  .select('guest_name, guest_phone, created_at')
  .eq('host_id', 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7')
  .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString())
  .order('created_at', { ascending: false })
  .then(({ data, error }) => {
    if (error) console.log('❌ Erreur:', error);
    else console.log('✅ Conversations récentes:', data);
  });
"
```

**Résultat attendu :**
- ✅ Conversations de test créées
- ✅ Toutes liées au bon host_id
- ✅ Créées dans les dernières 24h

---

## Résumé des Points de Validation

### ✅ Migration Configuration Réussie
- [ ] Les services utilisent `whatsapp_config` au lieu des variables d'environnement
- [ ] Configuration récupérée dynamiquement depuis la base
- [ ] Plus de dépendance à `WHATSAPP_TOKEN` et `WHATSAPP_PHONE_NUMBER_ID`

### ✅ Création de Conversations
- [ ] Service local fonctionne avec et sans template
- [ ] Edge function fonctionne avec et sans template
- [ ] Conversations créées avec toutes les données requises
- [ ] Gestion d'erreurs appropriée

### ✅ Système de Templates
- [ ] Configuration WhatsApp récupérée depuis la base
- [ ] Erreur explicite si token manquant
- [ ] Pas d'envoi si `send_welcome_template: false`
- [ ] Tentative d'envoi si `send_welcome_template: true`

### ⚠️ Pour Activer l'Envoi Réel
1. Ajouter un token WhatsApp valide dans la configuration base de données
2. Configurer les templates dans Meta Business Manager
3. Tester avec un numéro WhatsApp valide

---

## Script de Test Automatisé

Pour exécuter tous les tests d'un coup :
```bash
node test-final-whatsapp-integration.js
```

Ce script teste les 4 scénarios principaux et affiche un résumé complet des résultats.