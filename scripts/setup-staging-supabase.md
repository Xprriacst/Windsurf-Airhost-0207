# Guide : Création de l'Instance Staging Supabase

## Étape 1 : Créer le Projet Staging

1. **Se connecter à Supabase**
   - Aller sur https://supabase.com/dashboard
   - Se connecter avec le même compte que l'instance de production

2. **Créer un nouveau projet**
   - Cliquer sur "New Project"
   - **Nom du projet** : `airhost-staging`
   - **Organisation** : Même que production
   - **Région** : Même que production (pour minimiser la latence)
   - **Mot de passe de la base** : Générer un mot de passe fort (le noter)

3. **Attendre la création**
   - Le processus prend 2-3 minutes
   - Noter l'URL du projet (format: `https://[project-id].supabase.co`)

## Étape 2 : Récupérer les Clés d'API

Une fois le projet créé :

1. **Aller dans Settings > API**
2. **Copier les valeurs suivantes** :
   - Project URL : `https://[project-id].supabase.co`
   - anon public key : `eyJ...` (clé publique)
   - service_role secret key : `eyJ...` (clé secrète - sensible)

## Étape 3 : Configuration des Tables

L'instance staging doit avoir la même structure que production. Deux options :

### Option A : Migration via SQL (Recommandée)
```sql
-- Exporter la structure depuis production
-- Puis importer dans staging
```

### Option B : Recréer les tables manuellement
Tables nécessaires pour Airhost :
- `conversations`
- `messages`
- `conversation_analysis`
- `properties`
- `hosts`
- `notifications`

## Étape 4 : Configuration des Politiques RLS

Dupliquer les Row Level Security policies de production :
- Politiques pour les conversations
- Politiques pour les messages
- Politiques pour l'authentification

## Étape 5 : Configuration des Extensions

Activer les mêmes extensions que production :
- `uuid-ossp` (génération UUID)
- `pg_cron` (tâches planifiées si utilisé)

## Étape 6 : Test de Connexion

Tester la connexion avec les nouvelles clés avant de configurer l'environnement.

## Informations à fournir

Une fois terminé, fournissez :
1. **Project URL** : `https://[project-id].supabase.co`
2. **Anon Key** : `eyJ...`
3. **Service Role Key** : `eyJ...`

Ces informations seront ajoutées au fichier de configuration staging.