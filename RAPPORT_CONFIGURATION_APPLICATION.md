# Rapport : Configuration et Lancement de l'Application Airhost

## 1. Variables d'environnement VITE_ - Nécessité

### Pourquoi le préfixe VITE_ est obligatoire

**OUI, les variables VITE_ sont absolument nécessaires** pour les raisons suivantes :

1. **Sécurité Vite** : Vite expose uniquement les variables avec le préfixe `VITE_` au frontend par sécurité
2. **Isolation** : Les variables sans préfixe restent côté serveur et ne sont pas accessibles au code client
3. **Configuration Vite** : Le fichier `vite.config.replit.ts` définit `envPrefix: 'VITE_'` (ligne 93)

### Variables actuellement utilisées
```typescript
// Dans src/lib/supabase.ts
import.meta.env.VITE_SUPABASE_URL        // URL de la base Supabase
import.meta.env.VITE_SUPABASE_ANON_KEY   // Clé anonyme Supabase
import.meta.env.VITE_SITE_URL            // URL du site
import.meta.env.MODE                     // Mode de développement
```

## 2. Comment l'application se lance

### Architecture multi-services
L'application Airhost utilise une architecture microservices avec 4 composants principaux :

```
Port 5000: Application React (Frontend principal)
Port 3001: Webhook WhatsApp (Réception messages)
Port 8080: Service OpenAI (Analyse IA)
Port 3002: Création de conversations (Zapier)
```

### Commande de lancement
```bash
# Dans vite.config.replit.ts, l'application utilise :
npx vite --config vite.config.replit.ts --host 0.0.0.0 --port 5000 --force
```

### Workflow Replit configuré
```
Nom: "Airhost Complete App"
Commande: npx vite --config vite.config.replit.ts --host 0.0.0.0 --port 5000 --force
```

## 3. Définition de la base de données utilisée

### Hiérarchie de configuration (par ordre de priorité)

1. **Variables d'environnement système** (PRIORITÉ MAXIMALE)
   - Définies au niveau du shell/conteneur Replit
   - Surchargent tous les fichiers

2. **Fichier .env.local** (PRIORITÉ ÉLEVÉE)
   - Créé pour forcer la configuration production
   - Contenu actuel :
   ```
   VITE_SUPABASE_URL=https://pnbfsiicxhckptlgtjoj.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
   ```

3. **Fichiers .env, .env.production, .env.staging** (PRIORITÉ NORMALE)

4. **Valeurs par défaut dans le code** (PRIORITÉ MINIMALE)
   ```typescript
   // Dans src/lib/supabase.ts
   const defaultSupabaseUrl = 'https://pnbfsiicxhckptlgtjoj.supabase.co';
   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultSupabaseUrl;
   ```

### Problème identifié

**Variables système conflictuelles détectées :**
```bash
VITE_SUPABASE_URL=https://whxkhrtlccxubvjgexmi.supabase.co  # ❌ Ancienne URL
SUPABASE_URL=https://whxkhrtlccxubvjgexmi.supabase.co       # ❌ Ancienne URL
```

Ces variables système surchargent les fichiers .env et forcent l'utilisation de l'ancienne base de développement.

## 4. Bases de données configurées

### Base de données de développement (Ancienne)
- **URL** : `https://whxkhrtlccxubvjgexmi.supabase.co`
- **Usage** : Tests et développement initial
- **Statut** : Ne devrait plus être utilisée

### Base de données de production (Actuelle)
- **URL** : `https://pnbfsiicxhckptlgtjoj.supabase.co`
- **Usage** : Données réelles, système complet
- **Fonctionnalités** :
  - Système d'analyse GPT-4o
  - 6 catégories d'urgence
  - Filtrage par utilisateur/propriété
  - Conversations de production

## 5. Solution appliquée

### Actions prises
1. **Suppression variables système** : `unset VITE_SUPABASE_URL SUPABASE_URL`
2. **Création .env.local** : Configuration production forcée
3. **Redémarrage application** : `restart_workflow`

### Vérification nécessaire
L'indicateur de base de données dans le menu latéral devrait maintenant afficher :
- **Attendu** : `pnbfsiicxhckptlgtjoj` (production)
- **Ancien** : `whxkhrtlccxubvjgexmi` (développement)

## 6. Recommandations

### Gestion des environnements
1. **Production** : Utiliser uniquement `VITE_PROD_*` ou `.env.local`
2. **Développement** : Variables `VITE_DEV_*` ou `.env.development`
3. **Éviter** : Variables système sans préfixe d'environnement

### Monitoring
- L'indicateur de base de données dans le SideMenu affiche l'URL active
- Les logs de débogage dans la console montrent la configuration chargée
- Le système bascule automatiquement sur les valeurs par défaut si nécessaire

### Architecture recommandée
```
Frontend (React/Vite) ←→ Base Supabase Production
     ↓
Webhooks & Services (Node.js) ←→ Mêmes credentials
```

Cette architecture garantit la cohérence des données entre tous les services.