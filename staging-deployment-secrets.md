# Configuration des Secrets pour l'Environnement Staging

Pour basculer vers l'instance staging, vous devez mettre à jour les secrets de déploiement dans Replit :

## Secrets à modifier dans l'interface Replit :

### Instance Staging (tornfqtvnzkgnwfudxdb.supabase.co)

```
VITE_SUPABASE_URL=https://tornfqtvnzkgnwfudxdb.supabase.co

VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcm5mcXR2bnprZ253ZnVkeGRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3ODM2NDUsImV4cCI6MjA1NTM1OTY0NX0.ZAXvm4bVRZFyg8WNxiam_vgQ2iItuN06UTL2AzKyPsE

VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcm5mcXR2bnprZ253ZnVkeGRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTc4MzY0NSwiZXhwIjoyMDU1MzU5NjQ1fQ.nbhxWUoyYT5a8XxpC2la9sMYMKDJL95YQ9hhFvy5tos
```

## Instructions :

1. Dans l'interface Replit, cliquez sur les trois points (...) à côté de chaque secret
2. Sélectionnez "Edit" 
3. Remplacez la valeur par celle correspondante ci-dessus
4. Cliquez "Save"

### Secrets à conserver (inchangés) :
- `OPENAI_API_KEY` - Garde la même valeur
- `WHATSAPP_VERIFY_TOKEN` - Garde la même valeur  
- `SESSION_SECRET` - Garde la même valeur
- `FIREBASE_API_KEY` - Garde la même valeur

Une fois modifiés, l'application utilisera automatiquement l'instance staging avec la structure complète pour la détection d'urgence.

## Retour à l'environnement de développement :

Pour revenir à l'instance de développement :

```
VITE_SUPABASE_URL=https://whxkhrtlccxubvjgexmi.supabase.co

VITE_SUPABASE_ANON_KEY=[clé de développement]

VITE_SUPABASE_SERVICE_ROLE_KEY=[clé service de développement]
```