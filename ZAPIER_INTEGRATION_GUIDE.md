# Guide d'Intégration Zapier - Création de Conversations Airhost

## Vue d'ensemble

Cette intégration permet de créer automatiquement des conversations dans Airhost lorsqu'une nouvelle réservation est reçue via n'importe quelle plateforme (Airbnb, Booking.com, etc.).

## Configuration requise

### 1. Service de création de conversations
Le service `create-conversation-from-booking.js` doit être déployé et accessible publiquement.

**URL du webhook :** `https://votre-domaine.com/create-conversation`

### 2. Données à envoyer depuis Zapier

Configurez votre Zap pour envoyer une requête POST avec les données suivantes :

#### Champs obligatoires
```json
{
  "host_id": "{{uuid_de_l_hote}}",
  "guest_name": "{{nom_du_client}}",
  "guest_phone": "{{telephone_du_client}}",
  "property_id": "{{uuid_de_la_propriete}}"
}
```

#### Champs optionnels recommandés
```json
{
  "guest_email": "{{email_du_client}}",
  "check_in_date": "{{date_arrivee}}",
  "check_out_date": "{{date_depart}}",
  "booking_reference": "{{reference_reservation}}",
  "platform": "{{plateforme}}", // "Airbnb", "Booking.com", etc.
  "send_welcome_message": true,
  "welcome_template": "{{nom_du_template}}" // optionnel
}
```

## Configuration Zapier

### Étape 1 : Trigger (Déclencheur)
Configurez le déclencheur selon votre plateforme :
- **Airbnb** : Nouvelle réservation
- **Booking.com** : Nouvelle réservation
- **Email** : Nouveau mail de réservation

### Étape 2 : Action Webhook
1. Choisissez "Webhooks by Zapier"
2. Sélectionnez "POST"
3. URL : `https://votre-domaine.com/create-conversation`
4. Payload Type : JSON
5. Configurez les données selon le mapping ci-dessous

## Mapping des champs

### Depuis Airbnb
```json
{
  "host_id": "{{host_id_fixe}}", // À configurer manuellement
  "guest_name": "{{guest__first_name}} {{guest__last_name}}",
  "guest_phone": "{{guest__phone}}",
  "guest_email": "{{guest__email}}",
  "property_id": "{{property_id_fixe}}", // À configurer manuellement
  "check_in_date": "{{start_date}}",
  "check_out_date": "{{end_date}}",
  "booking_reference": "{{confirmation_code}}",
  "platform": "Airbnb",
  "send_welcome_message": true
}
```

### Depuis Booking.com
```json
{
  "host_id": "{{host_id_fixe}}", // À configurer manuellement
  "guest_name": "{{guest_name}}",
  "guest_phone": "{{guest_phone}}",
  "guest_email": "{{guest_email}}",
  "property_id": "{{property_id_fixe}}", // À configurer manuellement
  "check_in_date": "{{checkin_date}}",
  "check_out_date": "{{checkout_date}}",
  "booking_reference": "{{reservation_id}}",
  "platform": "Booking.com",
  "send_welcome_message": true
}
```

### Depuis un email de réservation
```json
{
  "host_id": "{{host_id_fixe}}", // À configurer manuellement
  "guest_name": "{{nom_extrait_du_mail}}",
  "guest_phone": "{{telephone_extrait_du_mail}}",
  "guest_email": "{{email_expediteur}}",
  "property_id": "{{property_id_fixe}}", // À configurer manuellement
  "check_in_date": "{{date_arrivee_extraite}}",
  "check_out_date": "{{date_depart_extraite}}",
  "booking_reference": "{{reference_extraite}}",
  "platform": "Email",
  "send_welcome_message": true
}
```

## Réponses attendues

### Succès - Nouvelle conversation
```json
{
  "success": true,
  "message": "Conversation créée avec succès",
  "conversation": {
    "id": "uuid-conversation",
    "guest_name": "Nom Client",
    "guest_phone": "+33123456789",
    "status": "active"
  },
  "isNewConversation": true,
  "welcomeMessage": {
    "success": true,
    "messageId": "whatsapp-message-id"
  }
}
```

### Succès - Conversation existante mise à jour
```json
{
  "success": true,
  "message": "Conversation mise à jour",
  "conversation": {
    "id": "uuid-conversation-existante",
    "guest_name": "Nom Client",
    "guest_phone": "+33123456789",
    "status": "active"
  },
  "isNewConversation": false,
  "welcomeMessage": null
}
```

### Erreur
```json
{
  "error": "Description de l'erreur",
  "details": "Détails techniques",
  "required": ["host_id", "guest_name", "guest_phone", "property_id"]
}
```

## Configuration des templates WhatsApp

### 1. Dans l'interface Airhost
1. Accédez aux paramètres WhatsApp
2. Configurez vos identifiants Meta Business
3. Activez "Envoyer un message de bienvenue"
4. Chargez vos templates disponibles
5. Sélectionnez le template par défaut

### 2. Templates recommandés
- `hello_world` : Template de base Meta
- `welcome_guest` : Template personnalisé de bienvenue
- `booking_confirmation` : Confirmation de réservation

## Variables d'environnement requises

```bash
# Service de création de conversations
SUPABASE_URL=https://votre-instance.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
PORT=3002

# Service WhatsApp (si séparé)
WHATSAPP_ACCESS_TOKEN=votre_token_meta
WHATSAPP_PHONE_NUMBER_ID=votre_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=votre_business_account_id
```

## Test de l'intégration

### 1. Test manuel
```bash
curl -X POST https://votre-domaine.com/create-conversation \
  -H "Content-Type: application/json" \
  -d '{
    "host_id": "votre-host-id",
    "guest_name": "Test Client",
    "guest_phone": "+33123456789",
    "property_id": "votre-property-id",
    "check_in_date": "2025-07-01",
    "check_out_date": "2025-07-07",
    "booking_reference": "TEST-12345",
    "platform": "Test",
    "send_welcome_message": true
  }'
```

### 2. Test endpoint dédié
```bash
curl -X POST https://votre-domaine.com/test-conversation \
  -H "Content-Type: application/json" \
  -d '{
    "host_id": "votre-host-id",
    "property_id": "votre-property-id"
  }'
```

## Dépannage

### Erreurs courantes

1. **"Hôte non trouvé"**
   - Vérifiez que `host_id` correspond à un hôte existant

2. **"Propriété non trouvée"**
   - Vérifiez que `property_id` existe et appartient à l'hôte

3. **"Numéro de téléphone invalide"**
   - Le numéro doit être au format international (+33...)

4. **"Configuration WhatsApp manquante"**
   - Configurez WhatsApp Business dans les paramètres

5. **"Template non trouvé"**
   - Vérifiez que le template existe et est approuvé par Meta

### Logs de débogage
Le service affiche des logs détaillés pour faciliter le débogage :
```
🏨 Création de conversation depuis réservation...
📋 Données reçues: {...}
📞 Numéro normalisé: +33123456789
♻️ Conversation existante trouvée: uuid
📱 Envoi du template WhatsApp "hello_world"
✅ Opération terminée avec succès
```

## Support

Pour toute question ou problème :
1. Vérifiez les logs du service
2. Testez avec l'endpoint de test
3. Vérifiez la configuration WhatsApp
4. Contactez le support technique