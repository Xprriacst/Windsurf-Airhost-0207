# Guide de Migration Production - Système de Tags d'Urgence

## Résumé

Ce guide explique comment déployer le système de classification GPT-4o en production. L'analyse comparative a identifié les différences clés entre développement et production.

## Différences Identifiées

### Tables Manquantes en Production
- `conversation_analysis` - Table principale pour les analyses GPT-4o

### Colonnes Manquantes
- **messages**: `host_id`, `media_url`, `media_type`, `whatsapp_message_id`, `error_message`
- **conversations**: Colonnes de synchronisation avec les analyses

## Méthodes de Déploiement

### Option 1: Script Automatisé (Recommandé)
```bash
# Exécuter le script de déploiement
./deploy-production-migration.sh
```

Le script effectue automatiquement:
- Validation de la connectivité
- Backup des données existantes
- Application de la migration SQL
- Tests de validation

### Option 2: Migration Manuelle via Supabase

1. **Accéder à l'interface Supabase Production**
   - URL: https://pnbfsiicxhckptlgtjoj.supabase.co
   - Aller dans SQL Editor

2. **Exécuter le fichier de migration**
   - Copier le contenu de `scripts/production-migration-tags.sql`
   - Coller dans SQL Editor
   - Exécuter la requête

3. **Valider la migration**
   ```sql
   SELECT * FROM test_emergency_system();
   ```

## Fonctionnalités Ajoutées

### Classification Automatique
- 6 catégories de tags avec GPT-4o
- Calcul automatique des priorités
- Synchronisation temps réel

### Performance
- 8 index optimisés
- Vues précalculées
- Triggers efficaces

### Sécurité
- Row Level Security activé
- Politiques d'accès configurées

## Tests de Validation

Après migration, vérifier:

1. **Structure des tables**
   ```sql
   \d conversation_analysis
   \d conversations
   \d messages
   ```

2. **Fonctions et triggers**
   ```sql
   SELECT * FROM test_emergency_system();
   ```

3. **Interface utilisateur**
   - Onglet "Urgences" fonctionnel
   - Classification des messages
   - Affichage des priorités

## Restauration en cas de problème

Si problème détecté:

1. **Restaurer depuis backup**
   ```bash
   # Les backups sont dans backup-YYYYMMDD-HHMMSS/
   ```

2. **Supprimer les nouvelles structures**
   ```sql
   DROP TABLE IF EXISTS conversation_analysis CASCADE;
   ```

## Support et Monitoring

Après déploiement, surveiller:
- Performance des requêtes
- Logs d'erreur Supabase
- Fonctionnement de l'analyse GPT-4o
- Interface utilisateur responsive

## Contact

En cas de problème, vérifier les logs dans:
- Console Supabase
- Logs application (port 5000)
- Service GPT-4o (port 8080)
- Webhook WhatsApp (port 3001)