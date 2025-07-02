# Guide de Déploiement Multi-Environnements Airhost

## Vue d'ensemble

Cette stratégie met en place trois environnements distincts pour assurer un développement et déploiement sécurisés :

- **Development** : Nouvelles fonctionnalités en cours
- **Staging** : Tests de pré-production  
- **Production** : Version stable pour les clients

## Configuration Rapide

### 1. Initialiser la Structure
```bash
# Configurer les branches Git
./scripts/setup-branches.sh

# Configurer l'environnement de développement
./scripts/environment-setup.sh development
```

### 2. Variables d'Environnement

Chaque environnement nécessite ses propres secrets :

**Development:**
- Instance Supabase dédiée au développement
- Token WhatsApp de test
- Clé OpenAI de développement

**Staging:**
- Instance Supabase miroir de production
- Token WhatsApp de test
- Clé OpenAI de production

**Production:**
- Instance Supabase production
- Token WhatsApp production
- Clé OpenAI production

### 3. Workflow de Développement

```bash
# Nouvelle fonctionnalité
git checkout develop
git checkout -b feature/nouvelle-fonctionnalite
# ... développement ...
git push origin feature/nouvelle-fonctionnalite
# Pull request vers develop

# Test en staging
git checkout staging
git merge develop
npm run deploy:staging

# Déploiement production
git checkout main  
git merge staging
npm run deploy:prod
```

## Scripts Disponibles

- `npm run deploy:dev` - Déploiement développement
- `npm run deploy:staging` - Déploiement staging
- `npm run deploy:prod` - Déploiement production
- `./scripts/migrate-db.sh` - Migration base de données
- `npm run backup:prod` - Sauvegarde production

## Sécurité

- Protection des branches main et staging
- Tests automatiques avant merge
- Sauvegarde automatique avant déploiement production
- Rollback automatique en cas d'erreur

## Instances Supabase Recommandées

1. **Production** : Instance principale avec données clients
2. **Staging** : Copie de production pour tests réalistes
3. **Development** : Instance séparée pour développement

## Webhook WhatsApp par Environnement

- **Production** : webhook-prod.airhost.com
- **Staging** : webhook-staging.airhost.com  
- **Development** : webhook-dev.airhost.com

Cette approche garantit l'isolation complète entre environnements et un déploiement sécurisé.