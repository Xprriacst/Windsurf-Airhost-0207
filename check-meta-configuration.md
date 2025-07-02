# Configuration Meta WhatsApp Business - Diagnostic

## Étapes de configuration requises

### 1. Configuration du Webhook
Dans votre interface Meta, section "Configuration" > "Webhooks" :

**URL de rappel :**
```
https://air-host-central-contactpolarisi.replit.app/webhook/whatsapp
```

**Token de vérification :**
```
airhost_webhook_verify_2024
```

### 2. Abonnement aux événements
Vérifiez que vous êtes abonné à :
- ✅ `messages` (obligatoire)
- ✅ `message_deliveries` (recommandé)
- ✅ `message_reads` (optionnel)

### 3. Numéros de téléphone
Dans "Configuration de l'API" :
- Votre numéro d'envoi : `+1 (555) 010-4726` doit être **vérifié**
- Votre numéro de réception : `+33617370484` doit être ajouté aux **numéros de test**

### 4. Token permanent
Dans "Configuration de l'API" > "Token permanent" :
- Créez un token permanent pour éviter l'expiration
- Copiez le token et utilisez-le dans vos variables d'environnement

### 5. Vérifications techniques
- Le webhook a été testé avec succès ✅
- L'URL publique est accessible ✅
- La vérification Meta fonctionne ✅

## Problèmes possibles

### A. Numéro de test non configuré
Le `+33617370484` doit être ajouté dans "Numéros de téléphone" > "Gérer numéros de téléphone" > "Ajouter un numéro de test"

### B. Événements non activés
Dans la section "Webhooks", cliquez sur "Gérer" et vérifiez que "messages" est coché

### C. Délai de propagation
Les changements de configuration Meta peuvent prendre 5-10 minutes à se propager

### D. Mode développement
Vérifiez que votre app Meta est en mode "Développement" avec les bons numéros de test configurés

## Test de validation
Une fois configuré, envoyez un message test depuis `+33617370484` vers `+1 (555) 010-4726`.
Le message devrait apparaître dans les logs avec un timestamp comme :
```
[2025-06-10T15:42:31.111Z] Webhook WhatsApp reçu: {...}
```