# Guide de Configuration Staging - Airhost

## Problème Identifié
L'instance staging manque la colonne `host_id` dans la table `conversations`, causant l'erreur SQL lors de l'exécution des scripts de migration.

## Solution Étape par Étape

### 1. Connexion à l'Instance Staging
- URL: https://tornfqtvnzkgnwfudxdb.supabase.co
- Connectez-vous avec vos identifiants Supabase

### 2. Correction du Schéma (OBLIGATOIRE)
Dans l'éditeur SQL de Supabase staging, exécutez ce code :

```sql
-- Ajouter la colonne host_id manquante
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES hosts(id);

-- Créer l'index pour la performance
CREATE INDEX IF NOT EXISTS idx_conversations_host_id ON conversations(host_id);

-- Mettre à jour les conversations existantes avec un host par défaut
UPDATE conversations 
SET host_id = (SELECT id FROM hosts LIMIT 1)
WHERE host_id IS NULL
AND EXISTS (SELECT 1 FROM hosts);

-- Vérification
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'conversations'
AND column_name = 'host_id';
```

### 3. Vérification de la Structure conversation_analysis
Exécutez également :

```sql
-- S'assurer que conversation_analysis a la bonne structure
CREATE TABLE IF NOT EXISTS conversation_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL,
    tag TEXT NOT NULL,
    confidence DECIMAL(3,2),
    explanation TEXT,
    recommended_action TEXT,
    needs_attention BOOLEAN DEFAULT false,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    analyzed_by TEXT DEFAULT 'gpt-4o'
);

-- Index pour la performance
CREATE INDEX IF NOT EXISTS idx_analysis_conversation_id ON conversation_analysis(conversation_id);
CREATE INDEX IF NOT EXISTS idx_analysis_tag ON conversation_analysis(tag);
CREATE INDEX IF NOT EXISTS idx_analysis_needs_attention ON conversation_analysis(needs_attention);
```

### 4. Test de Validation
Après la correction, cette requête doit fonctionner sans erreur :

```sql
SELECT 
    c.id,
    c.guest_name,
    c.host_id,
    h.name as host_name
FROM conversations c
LEFT JOIN hosts h ON c.host_id = h.id
LIMIT 5;
```

## Configuration des Environnements

### Variables d'Environnement Staging (.env.staging)
```env
VITE_SUPABASE_URL=https://tornfqtvnzkgnwfudxdb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcm5mcXR2bnprZ253ZnVkeGRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3ODM2NDUsImV4cCI6MjA1NTM1OTY0NX0.ZAXvm4bVRZFyg8WNxiam_vgQ2iItuN06UTL2AzKyPsE
NODE_ENV=staging
```

### Variables d'Environnement Production (.env.production)
```env
VITE_SUPABASE_URL=https://pnbfsiicxhckptlgtjoj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuYmZzaWljeGhja3B0bGd0am9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NjU1MDIsImV4cCI6MjA2MzI0MTUwMn0.hD0TZ9xgYMGDBUZkvwb1KeYcBhEqX5TlNmCcOUDEPnY
NODE_ENV=production
```

## Commandes de Déploiement

### Démarrer en Staging
```bash
cp .env.staging .env
npm run dev
```

### Démarrer en Production
```bash
cp .env.production .env
npm run build
npm run preview
```

## Prochaines Étapes
1. Exécuter les corrections SQL sur staging
2. Tester la fonctionnalité de tags d'urgence
3. Valider l'analyse des conversations
4. Déployer en production si tout fonctionne