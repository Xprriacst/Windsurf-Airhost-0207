# Stratégie de Déploiement Airhost

## Structure des Branches

### 1. Branche Production (`main`)
- **Usage**: Version stable pour les clients
- **Déploiement**: Automatique vers l'environnement de production
- **Protection**: Merge uniquement depuis `staging` après validation
- **URL**: `airhost-prod.replit.app`

### 2. Branche Staging (`staging`)
- **Usage**: Tests de pré-production et validation
- **Déploiement**: Automatique vers l'environnement de staging
- **Source**: Merge depuis `develop` après tests unitaires
- **URL**: `airhost-staging.replit.app`

### 3. Branche Développement (`develop`)
- **Usage**: Intégration des nouvelles features
- **Déploiement**: Automatique vers l'environnement de développement
- **Source**: Merge des branches de features
- **URL**: `airhost-dev.replit.app`

### 4. Branches Features (`feature/nom-feature`)
- **Usage**: Développement de nouvelles fonctionnalités
- **Déploiement**: Environnement de test temporaire
- **Source**: Branchement depuis `develop`
- **Merge**: Vers `develop` après validation

## Environnements

### Production
- Base de données: Supabase Production
- Configuration: Variables d'environnement de production
- Monitoring: Alerts et logs complets
- Backup: Automatique quotidien

### Staging
- Base de données: Supabase Staging (copie de production)
- Configuration: Variables similaires à la production
- Tests: E2E et tests d'intégration
- Accès: Équipe et clients sélectionnés

### Développement
- Base de données: Supabase Development
- Configuration: Variables de développement
- Features: Dernières fonctionnalités en cours
- Accès: Équipe de développement

## Workflow de Déploiement

1. **Développement Feature**
   ```bash
   git checkout develop
   git checkout -b feature/nouvelle-fonctionnalite
   # Développement...
   git push origin feature/nouvelle-fonctionnalite
   ```

2. **Integration**
   ```bash
   # Pull request: feature/xxx -> develop
   # Tests automatiques
   # Review de code
   # Merge vers develop
   ```

3. **Staging**
   ```bash
   # Pull request: develop -> staging
   # Tests d'intégration
   # Validation métier
   # Merge vers staging
   ```

4. **Production**
   ```bash
   # Pull request: staging -> main
   # Tests de pré-production
   # Validation finale
   # Merge vers main
   # Déploiement automatique
   ```

## Configuration des Environnements

### Variables d'Environnement par Branche

#### Production (.env.production)
```env
VITE_SUPABASE_URL=https://production-instance.supabase.co
VITE_SUPABASE_ANON_KEY=prod_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=prod_service_key
VITE_OPENAI_API_KEY=prod_openai_key
VITE_WHATSAPP_VERIFY_TOKEN=prod_whatsapp_token
VITE_ENVIRONMENT=production
VITE_SITE_URL=https://airhost-prod.replit.app
```

#### Staging (.env.staging)
```env
VITE_SUPABASE_URL=https://staging-instance.supabase.co
VITE_SUPABASE_ANON_KEY=staging_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=staging_service_key
VITE_OPENAI_API_KEY=staging_openai_key
VITE_WHATSAPP_VERIFY_TOKEN=staging_whatsapp_token
VITE_ENVIRONMENT=staging
VITE_SITE_URL=https://airhost-staging.replit.app
```

#### Development (.env.development)
```env
VITE_SUPABASE_URL=https://development-instance.supabase.co
VITE_SUPABASE_ANON_KEY=dev_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=dev_service_key
VITE_OPENAI_API_KEY=dev_openai_key
VITE_WHATSAPP_VERIFY_TOKEN=dev_whatsapp_token
VITE_ENVIRONMENT=development
VITE_SITE_URL=https://airhost-dev.replit.app
```

## Scripts de Déploiement

### Automatisation GitHub Actions / Replit
- Tests automatiques sur chaque push
- Déploiement automatique selon la branche
- Notifications Slack/Discord
- Rollback automatique en cas d'erreur

## Gestion des Bases de Données

### Migration et Synchronisation
- Scripts de migration pour chaque environnement
- Synchronisation des schémas entre environnements
- Backup avant chaque déploiement production
- Rollback de base de données si nécessaire

## Monitoring et Alertes

### Production
- Uptime monitoring
- Performance tracking
- Error tracking (Sentry)
- Logs centralisés

### Staging
- Tests d'intégration automatiques
- Validation des performances
- Tests de charge

### Development
- Logs de développement
- Métriques de performance
- Tests unitaires