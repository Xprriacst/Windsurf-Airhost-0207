# Déploiement de la Edge Function Supabase

## Instructions pour déployer la fonction create-conversation-with-welcome

### 1. Se connecter à Supabase CLI
```bash
npx supabase login
```

### 2. Lier le projet à votre instance Supabase
```bash
npx supabase link --project-ref pnbfsiicxhckptlgtjoj
```

### 3. Déployer la edge function
```bash
npx supabase functions deploy create-conversation-with-welcome
```

## Alternative : Déploiement via l'interface Supabase

1. Allez sur https://supabase.com/dashboard/project/pnbfsiicxhckptlgtjoj/functions
2. Cliquez sur "Deploy a new function"
3. Choisissez "Via Editor"
4. Nom de la fonction : `create-conversation-with-welcome`
5. Copiez le contenu du fichier `supabase/functions/create-conversation-with-welcome/index.ts`

## URL possibles de la edge function une fois déployée
Selon le nom utilisé lors du déploiement :
```
https://pnbfsiicxhckptlgtjoj.supabase.co/functions/v1/create-conversation-with-welcome
https://pnbfsiicxhckptlgtjoj.supabase.co/functions/v1/create-conversation
https://pnbfsiicxhckptlgtjoj.supabase.co/functions/v1/[nom-exact-déployé]
```

## Exemple d'utilisation pour créer une conversation
```bash
curl -X POST https://pnbfsiicxhckptlgtjoj.supabase.co/functions/v1/create-conversation-with-welcome \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "host_id": "a2ce1797-a5ab-4c37-9512-4a4058e0f1c7",
    "guest_name": "Sophie Martin", 
    "guest_phone": "+33617370485",
    "property_id": "a0624296-4e92-469c-9be2-dcbe8ff547c2",
    "check_in_date": "2025-06-20",
    "check_out_date": "2025-06-25",
    "send_welcome_template": true,
    "welcome_template_name": "bienvenue_villa"
  }'
```

## Variables d'environnement à configurer dans Supabase

Dans le dashboard Supabase > Project Settings > Edge Functions, ajoutez :
- `WHATSAPP_TOKEN`: Token de l'API WhatsApp Business
- `WHATSAPP_PHONE_NUMBER_ID`: ID du numéro WhatsApp Business