# Guide de Bascule Base de Données Airhost

## Vue d'ensemble

Ce guide explique comment basculer facilement entre la base de données de production et de développement sans rien oublier.

## Problème résolu

Avant, il fallait modifier manuellement plusieurs fichiers et on oubliait souvent des configurations, ce qui causait des erreurs. Maintenant, un seul script fait tout automatiquement.

## Prérequis

Configurez d'abord les secrets Replit dans le panneau "Secrets" :

### Secrets Production
- `VITE_PROD_SUPABASE_URL`
- `VITE_PROD_SUPABASE_ANON_KEY`  
- `VITE_PROD_SUPABASE_SERVICE_ROLE_KEY`

### Secrets Développement
- `DEV_VITE_SUPABASE_URL`
- `DEV_VITE_SUPABASE_ANON_KEY`
- `DEV_VITE_SUPABASE_SERVICE_ROLE_KEY`

## Utilisation

### 1. Voir la configuration actuelle
```bash
node switch-database.js status
```

### 2. Basculer vers la production
```bash
node switch-database.js production
```

### 3. Basculer vers le développement  
```bash
node switch-database.js development
```

## Ce que fait le script automatiquement

### Fichiers modifiés
- `.env` - Variables d'environnement principales
- `src/lib/supabase.ts` - Configuration client Supabase
- `whatsapp-webhook-server.js` - Serveur webhook WhatsApp
- `openai_service.py` - Service d'analyse IA
- `create-conversation-from-booking.js` - Créateur de conversations

### Sauvegardes automatiques
- Crée un backup avant chaque bascule
- Restaure automatiquement en cas d'erreur
- Garde un historique des changements

### Validation complète
- Vérifie que tous les fichiers sont correctement mis à jour
- Teste la connexion à la base de données
- Affiche un rapport de validation

## Bases de données disponibles

### Production (Airhost-REC)
- **URL**: `https://pnbfsiicxhckptlgtjoj.supabase.co`
- **Utilisation**: Données clients réelles
- **Environnement**: `production`

### Développement
- **URL**: `https://whxkhrtlccxubvjgexmi.supabase.co`  
- **Utilisation**: Tests et développement
- **Environnement**: `development`

## Après la bascule

Une fois la bascule terminée, redémarrez les workflows Replit :

1. **Airhost Complete App** (port 5000)
2. **WhatsApp Webhook** (port 3001)  
3. **OpenAI Service** (port 8080)
4. **Conversation Creator** (port 3002)

## Vérification

### Tester la configuration
```bash
node test-database-switch.js
```

### Vérifier l'interface
1. Ouvrez l'application dans le navigateur
2. Vérifiez que les conversations se chargent
3. Testez la connexion utilisateur

## Historique des changements

Le script garde automatiquement :
- Un fichier de log avec timestamp
- Un backup des fichiers modifiés
- Un rapport de validation

## En cas de problème

### Restauration automatique
Si une erreur survient, le script restaure automatiquement la configuration précédente.

### Restauration manuelle
```bash
# Les backups sont dans backup-YYYY-MM-DD-HH-MM-SS/
cp backup-*/file.ext ./file.ext
```

### Support
1. Vérifiez les logs : `switch-database-*.log`
2. Testez la configuration : `node test-database-switch.js`
3. Consultez le statut : `node switch-database.js status`

## Configuration technique

### Variables d'environnement gérées
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_SERVICE_ROLE_KEY`
- `NODE_ENV`
- `VITE_APP_ENV`

### Services impactés
- Interface React (frontend)
- Webhook WhatsApp (réception messages)
- Service OpenAI (analyse IA)
- Créateur conversations (Zapier)

## Sécurité

- Toutes les clés API sont validées
- Les backups sont automatiques
- Aucune clé n'est exposée dans les logs
- Restoration automatique en cas d'erreur

---

**Important** : Toujours tester après une bascule pour s'assurer que tout fonctionne correctement.