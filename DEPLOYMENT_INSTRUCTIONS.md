# Instructions de Déploiement - Migration Production

## Étape 1: Accès à Supabase Production

1. Connectez-vous à Supabase: https://supabase.com/dashboard
2. Sélectionnez le projet production: **pnbfsiicxhckptlgtjoj**
3. Allez dans **SQL Editor** (icône base de données dans le menu)

## Étape 2: Application de la Migration

1. **Ouvrez le fichier de migration**
   - Fichier: `scripts/production-migration-tags.sql`
   - Copiez tout le contenu (Ctrl+A puis Ctrl+C)

2. **Exécutez la migration**
   - Dans SQL Editor, collez le script complet
   - Cliquez sur **RUN** (bouton vert)
   - Attendez la confirmation d'exécution

## Étape 3: Validation

Exécutez ces requêtes de test dans SQL Editor:

```sql
-- Test 1: Vérifier la table principale
SELECT * FROM conversation_analysis LIMIT 1;

-- Test 2: Vérifier les nouvelles colonnes conversations
SELECT needs_attention, priority_level FROM conversations LIMIT 1;

-- Test 3: Vérifier les nouvelles colonnes messages  
SELECT host_id, whatsapp_message_id FROM messages LIMIT 1;

-- Test 4: Test complet du système
SELECT * FROM test_emergency_system();
```

## Étape 4: Vérification Interface

1. Rechargez l'application Airhost
2. Naviguez vers l'onglet **Urgences**
3. Vérifiez que les conversations s'affichent correctement
4. Testez l'envoi d'un message via WhatsApp

## En cas de Problème

Si une erreur survient:

1. **Vérifiez les logs** dans SQL Editor
2. **Consultez le backup** créé dans `backup-20250614-094257/`
3. **Contactez le support** avec le message d'erreur exact

## Fichiers de Référence

- **Migration SQL**: `scripts/production-migration-tags.sql`
- **Guide complet**: `PRODUCTION_MIGRATION_GUIDE.md`
- **Tests**: `test-production-readiness.js`

## Confirmation Finale

Une fois la migration réussie, vous devriez voir:
- Table `conversation_analysis` créée
- 6 catégories de tags disponibles
- Interface Urgences fonctionnelle
- Classification GPT-4o active