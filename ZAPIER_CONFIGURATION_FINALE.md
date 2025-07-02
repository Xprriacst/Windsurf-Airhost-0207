# Configuration Zapier pour Templates WhatsApp Automatiques

## URL de l'endpoint
```
http://localhost:3002/create-conversation
```

## Configuration HTTP
- **Méthode** : POST
- **Content-Type** : application/json

## Corps de la requête JSON

### Option 1 : Configuration complète (recommandée)
```json
{
  "host_id": "a2ce1797-a5ab-4c37-9512-4a4058e0f1c7",
  "property_id": "a0624296-4e92-469c-9be2-dcbe8ff547c2",
  "guest_name": "{{guest_name}}",
  "guest_phone": "{{guest_phone}}",
  "check_in_date": "{{check_in_date}}",
  "check_out_date": "{{check_out_date}}",
  "send_welcome_message": true,
  "welcome_template": "hello_world"
}
```

### Option 2 : Configuration simplifiée
```json
{
  "guest_name": "{{guest_name}}",
  "guest_phone": "{{guest_phone}}",
  "property_name": "Villa Côte d'Azur",
  "check_in_date": "{{check_in_date}}",
  "check_out_date": "{{check_out_date}}",
  "send_welcome_message": true,
  "welcome_template": "hello_world"
}
```

## Champs Zapier à mapper
- `{{guest_name}}` : Nom du client depuis la plateforme de réservation
- `{{guest_phone}}` : Numéro de téléphone du client
- `{{check_in_date}}` : Date d'arrivée (format YYYY-MM-DD)
- `{{check_out_date}}` : Date de départ (format YYYY-MM-DD)

## Paramètres obligatoires
- `guest_name` : Nom du client
- `guest_phone` : Numéro de téléphone
- `send_welcome_message: true` : Active l'envoi automatique
- `welcome_template: "hello_world"` : Template WhatsApp à envoyer

## Fonctionnement
1. Zapier envoie les données de réservation au service
2. Le service normalise le numéro de téléphone
3. Le service récupère votre configuration WhatsApp depuis la base
4. Le template "hello_world" est envoyé automatiquement
5. La conversation est créée et apparaît dans votre interface

## Test manuel
Vous pouvez tester avec curl :
```bash
curl -X POST http://localhost:3002/create-conversation \
  -H "Content-Type: application/json" \
  -d '{
    "guest_name": "Test Client",
    "guest_phone": "+33666123456",
    "property_name": "Villa Côte d'\''Azur",
    "check_in_date": "2025-06-26",
    "check_out_date": "2025-06-27",
    "send_welcome_message": true,
    "welcome_template": "hello_world"
  }'
```

## Résultat attendu
- Conversation créée dans l'interface
- Template WhatsApp envoyé automatiquement
- Message ID confirmé par Meta Business API