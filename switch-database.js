#!/usr/bin/env node
/**
 * Script de bascule entre base de données Production et Développement
 * Résout tous les problèmes de configuration rencontrés précédemment
 * 
 * Usage:
 *   node switch-database.js production
 *   node switch-database.js development
 *   node switch-database.js status
 */

import fs from 'fs';
import path from 'path';

// Configuration des bases de données utilisant les secrets Replit
function getDatabaseConfigs() {
  const configs = {
    production: {
      name: "Production (Airhost-REC)",
      url: process.env.VITE_PROD_SUPABASE_URL || process.env.PROD_SUPABASE_URL,
      anon_key: process.env.VITE_PROD_SUPABASE_ANON_KEY || process.env.PROD_SUPABASE_ANON_KEY,
      service_role_key: process.env.VITE_PROD_SUPABASE_SERVICE_ROLE_KEY || process.env.PROD_SUPABASE_SERVICE_ROLE_KEY,
      env: "production",
      description: "Base principale avec données clients réelles"
    },
    development: {
      name: "Développement",
      url: process.env.DEV_VITE_SUPABASE_URL || process.env.DEV_SUPABASE_URL,
      anon_key: process.env.DEV_VITE_SUPABASE_ANON_KEY || process.env.DEV_SUPABASE_ANON_KEY,
      service_role_key: process.env.DEV_VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.DEV_SUPABASE_SERVICE_ROLE_KEY,
      env: "development",
      description: "Base de test pour développement"
    }
  };
  
  return configs;
}

// Validation des secrets Replit
function validateSecrets() {
  const requiredSecrets = {
    production: [
      'VITE_PROD_SUPABASE_URL', 'PROD_SUPABASE_URL',
      'VITE_PROD_SUPABASE_ANON_KEY', 'PROD_SUPABASE_ANON_KEY',
      'VITE_PROD_SUPABASE_SERVICE_ROLE_KEY', 'PROD_SUPABASE_SERVICE_ROLE_KEY'
    ],
    development: [
      'DEV_VITE_SUPABASE_URL', 'DEV_SUPABASE_URL',
      'DEV_VITE_SUPABASE_ANON_KEY', 'DEV_SUPABASE_ANON_KEY',
      'DEV_VITE_SUPABASE_SERVICE_ROLE_KEY', 'DEV_SUPABASE_SERVICE_ROLE_KEY'
    ]
  };
  
  const missing = [];
  
  for (const [env, secrets] of Object.entries(requiredSecrets)) {
    const hasAnyUrl = secrets.filter(s => s.includes('URL')).some(s => process.env[s]);
    const hasAnyAnon = secrets.filter(s => s.includes('ANON')).some(s => process.env[s]);
    const hasAnyService = secrets.filter(s => s.includes('SERVICE')).some(s => process.env[s]);
    
    if (!hasAnyUrl) missing.push(`${env} URL secrets`);
    if (!hasAnyAnon) missing.push(`${env} ANON_KEY secrets`);
    if (!hasAnyService) missing.push(`${env} SERVICE_ROLE_KEY secrets`);
  }
  
  return missing;
}

// Variables de configuration dynamiques
const DATABASE_CONFIGS = getDatabaseConfigs();

// Fichiers à modifier
const FILES_TO_UPDATE = [
  '.env',
  'src/lib/supabase.ts',
  'whatsapp-webhook-server.js',
  'openai_service.py',
  'create-conversation-from-booking.js'
];

// Patterns à remplacer dans les fichiers
const REPLACEMENT_PATTERNS = {
  // Variables d'environnement
  env: {
    VITE_SUPABASE_URL: (config) => `VITE_SUPABASE_URL=${config.url}`,
    VITE_SUPABASE_ANON_KEY: (config) => `VITE_SUPABASE_ANON_KEY=${config.anon_key}`,
    SUPABASE_SERVICE_ROLE_KEY: (config) => `SUPABASE_SERVICE_ROLE_KEY=${config.service_role_key}`,
    VITE_SUPABASE_SERVICE_ROLE_KEY: (config) => `VITE_SUPABASE_SERVICE_ROLE_KEY=${config.service_role_key}`,
    NODE_ENV: (config) => `NODE_ENV=${config.env}`,
    VITE_APP_ENV: (config) => `VITE_APP_ENV=${config.env}`
  },
  
  // Patterns dans le code TypeScript
  typescript: {
    supabaseUrl: (config) => `const supabaseUrl = '${config.url}';`,
    supabaseAnonKey: (config) => `const supabaseAnonKey = '${config.anon_key}';`,
    prodUrl: (config) => `VITE_PROD_SUPABASE_URL=${config.url}`,
    prodKey: (config) => `VITE_PROD_SUPABASE_ANON_KEY=${config.anon_key}`
  },
  
  // Patterns dans les scripts Node.js
  javascript: {
    supabaseUrl: (config) => `const supabaseUrl = '${config.url}';`,
    supabaseKey: (config) => `const supabaseKey = '${config.anon_key}';`,
    serviceKey: (config) => `const serviceKey = '${config.service_role_key}';`
  }
};

class DatabaseSwitcher {
  constructor() {
    this.backupDir = `./backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
    this.logFile = `./switch-database-${Date.now()}.log`;
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  async createBackup() {
    this.log('🔄 Création du backup des fichiers...');
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    for (const file of FILES_TO_UPDATE) {
      if (fs.existsSync(file)) {
        const backupPath = path.join(this.backupDir, path.basename(file));
        fs.copyFileSync(file, backupPath);
        this.log(`✅ Backup créé: ${file} -> ${backupPath}`);
      }
    }
    
    this.log(`📁 Backup complet dans: ${this.backupDir}`);
  }

  async getCurrentConfig() {
    try {
      const envContent = fs.readFileSync('.env', 'utf8');
      const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
      
      if (urlMatch) {
        const currentUrl = urlMatch[1].trim();
        for (const [env, config] of Object.entries(DATABASE_CONFIGS)) {
          if (config.url === currentUrl) {
            return { environment: env, config };
          }
        }
      }
      
      return { environment: 'unknown', config: null };
    } catch (error) {
      this.log(`⚠️ Erreur lecture configuration actuelle: ${error.message}`);
      return { environment: 'error', config: null };
    }
  }

  async updateEnvFile(config) {
    this.log('🔄 Mise à jour du fichier .env...');
    
    const envTemplate = `# Configuration ${config.name}
# Générée automatiquement le ${new Date().toISOString()}

# Supabase ${config.name}
VITE_SUPABASE_URL=${config.url}
VITE_SUPABASE_ANON_KEY=${config.anon_key}

# Service Key pour scripts backend
SUPABASE_SERVICE_ROLE_KEY=${config.service_role_key}
VITE_SUPABASE_SERVICE_ROLE_KEY=${config.service_role_key}

# Variables PROD (pour compatibilité)
VITE_PROD_SUPABASE_URL=${config.url}
VITE_PROD_SUPABASE_ANON_KEY=${config.anon_key}
VITE_PROD_SUPABASE_SERVICE_ROLE_KEY=${config.service_role_key}

# Environnement
NODE_ENV=${config.env}
VITE_APP_ENV=${config.env}

# Ports
VITE_PORT=5000
OPENAI_SERVICE_PORT=8080
WHATSAPP_WEBHOOK_PORT=3001

# OpenAI (utilise la variable Replit)
OPENAI_API_KEY=\${OPENAI_API_KEY}

# Configuration ${config.env}
VITE_ENABLE_DEBUG=${config.env === 'development' ? 'true' : 'false'}
VITE_ENABLE_ANALYTICS=${config.env === 'production' ? 'true' : 'false'}
VITE_ENABLE_ERROR_REPORTING=${config.env === 'production' ? 'true' : 'false'}

# WhatsApp Webhook Token
WHATSAPP_VERIFY_TOKEN=airhost_webhook_verify_2024
`;

    fs.writeFileSync('.env', envTemplate);
    this.log('✅ Fichier .env mis à jour');
  }

  async updateSupabaseTs(config) {
    this.log('🔄 Mise à jour de src/lib/supabase.ts...');
    
    const supabaseTemplate = `import { createClient } from '@supabase/supabase-js';
import { getSiteUrl } from '../utils/url';

// Configuration ${config.name}
// Générée automatiquement le ${new Date().toISOString()}

console.log('========== CONFIGURATION SUPABASE ==========');
console.log('Environnement:', '${config.env}');
console.log('Base de données:', '${config.name}');
console.log('URL:', '${config.url}');
console.log('==========================================');

// Configuration explicite pour ${config.name}
const supabaseUrl = '${config.url}';
const supabaseAnonKey = '${config.anon_key}';
const supabaseServiceRoleKey = '${config.service_role_key}';

// Vérifications de sécurité
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Configuration Supabase invalide!');
  throw new Error('Variables Supabase manquantes');
}

// Logs de validation
console.log('✅ Configuration validée:');
console.log('- URL:', supabaseUrl);
console.log('- Clé publique:', supabaseAnonKey.substring(0, 30) + '...');
console.log('- Clé service:', supabaseServiceRoleKey ? 'Présente' : 'Manquante');
console.log('- Site URL:', getSiteUrl());

// Création des clients Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

console.log('✅ Clients Supabase initialisés pour ${config.name}');
`;

    fs.writeFileSync('src/lib/supabase.ts', supabaseTemplate);
    this.log('✅ Fichier src/lib/supabase.ts mis à jour');
  }

  async updateWebhookServer(config) {
    if (!fs.existsSync('whatsapp-webhook-server.js')) return;
    
    this.log('🔄 Mise à jour du serveur webhook WhatsApp...');
    
    let content = fs.readFileSync('whatsapp-webhook-server.js', 'utf8');
    
    // Remplacer les URLs Supabase
    content = content.replace(
      /const supabaseUrl = ['"][^'"]+['"]/g,
      `const supabaseUrl = '${config.url}'`
    );
    
    // Remplacer les clés
    content = content.replace(
      /const supabaseKey = ['"][^'"]+['"]/g,
      `const supabaseKey = '${config.service_role_key}'`
    );
    
    fs.writeFileSync('whatsapp-webhook-server.js', content);
    this.log('✅ Serveur webhook mis à jour');
  }

  async updateOpenAIService(config) {
    if (!fs.existsSync('openai_service.py')) return;
    
    this.log('🔄 Mise à jour du service OpenAI...');
    
    let content = fs.readFileSync('openai_service.py', 'utf8');
    
    // Remplacer l'URL Supabase
    content = content.replace(
      /SUPABASE_URL = ['"][^'"]+['"]/g,
      `SUPABASE_URL = '${config.url}'`
    );
    
    // Remplacer la clé
    content = content.replace(
      /SUPABASE_KEY = ['"][^'"]+['"]/g,
      `SUPABASE_KEY = '${config.service_role_key}'`
    );
    
    fs.writeFileSync('openai_service.py', content);
    this.log('✅ Service OpenAI mis à jour');
  }

  async updateConversationCreator(config) {
    if (!fs.existsSync('create-conversation-from-booking.js')) return;
    
    this.log('🔄 Mise à jour du créateur de conversations...');
    
    let content = fs.readFileSync('create-conversation-from-booking.js', 'utf8');
    
    // Remplacer les configurations Supabase
    content = content.replace(
      /const supabaseUrl = ['"][^'"]+['"]/g,
      `const supabaseUrl = '${config.url}'`
    );
    
    content = content.replace(
      /const supabaseKey = ['"][^'"]+['"]/g,
      `const supabaseKey = '${config.service_role_key}'`
    );
    
    fs.writeFileSync('create-conversation-from-booking.js', content);
    this.log('✅ Créateur de conversations mis à jour');
  }

  async validateConfiguration(config) {
    this.log('🔍 Validation de la configuration...');
    
    const checks = [
      { file: '.env', check: () => fs.existsSync('.env') },
      { file: 'src/lib/supabase.ts', check: () => fs.existsSync('src/lib/supabase.ts') },
      { 
        name: 'URL dans .env', 
        check: () => {
          const content = fs.readFileSync('.env', 'utf8');
          return content.includes(config.url);
        }
      },
      { 
        name: 'URL dans supabase.ts', 
        check: () => {
          const content = fs.readFileSync('src/lib/supabase.ts', 'utf8');
          return content.includes(config.url);
        }
      }
    ];
    
    let allValid = true;
    for (const check of checks) {
      const isValid = check.check();
      this.log(`${isValid ? '✅' : '❌'} ${check.name || check.file}: ${isValid ? 'OK' : 'ERREUR'}`);
      if (!isValid) allValid = false;
    }
    
    return allValid;
  }

  async restartServices() {
    this.log('🔄 Information: Redémarrage des services requis');
    this.log('📝 Pour appliquer les changements, redémarrez:');
    this.log('   1. Le serveur principal (workflow "Airhost Complete App")');
    this.log('   2. Le webhook WhatsApp (workflow "WhatsApp Webhook")');
    this.log('   3. Le service OpenAI (workflow "OpenAI Service")');
    this.log('   4. Le créateur de conversations (workflow "Conversation Creator")');
  }

  async switchTo(environment) {
    if (!DATABASE_CONFIGS[environment]) {
      throw new Error(`Environnement invalide: ${environment}. Disponibles: ${Object.keys(DATABASE_CONFIGS).join(', ')}`);
    }

    const config = DATABASE_CONFIGS[environment];
    
    this.log(`🚀 Début de la bascule vers: ${config.name}`);
    this.log(`📊 URL cible: ${config.url}`);
    
    // Vérifier la configuration actuelle
    const current = await this.getCurrentConfig();
    if (current.environment === environment) {
      this.log(`ℹ️ L'application utilise déjà ${config.name}`);
      return;
    }
    
    // Créer un backup
    await this.createBackup();
    
    try {
      // Mettre à jour tous les fichiers
      await this.updateEnvFile(config);
      await this.updateSupabaseTs(config);
      await this.updateWebhookServer(config);
      await this.updateOpenAIService(config);
      await this.updateConversationCreator(config);
      
      // Valider la configuration
      const isValid = await this.validateConfiguration(config);
      
      if (isValid) {
        this.log(`✅ Bascule réussie vers ${config.name}!`);
        this.log(`📋 Résumé:`);
        this.log(`   - Environnement: ${config.env}`);
        this.log(`   - Base: ${config.name}`);
        this.log(`   - URL: ${config.url}`);
        this.log(`   - Backup: ${this.backupDir}`);
        
        await this.restartServices();
        
      } else {
        throw new Error('Validation de la configuration échouée');
      }
      
    } catch (error) {
      this.log(`❌ Erreur lors de la bascule: ${error.message}`);
      this.log(`🔄 Restauration du backup...`);
      await this.restoreBackup();
      throw error;
    }
  }

  async restoreBackup() {
    for (const file of FILES_TO_UPDATE) {
      const backupPath = path.join(this.backupDir, path.basename(file));
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, file);
        this.log(`🔄 Restauré: ${backupPath} -> ${file}`);
      }
    }
  }

  async showStatus() {
    // Validation des secrets Replit
    const missingSecrets = validateSecrets();
    
    console.log('\n========== STATUT CONFIGURATION ACTUELLE ==========');
    
    if (missingSecrets.length > 0) {
      console.log('⚠️ SECRETS REPLIT MANQUANTS:');
      missingSecrets.forEach(secret => console.log(`   ❌ ${secret}`));
      console.log('\nConfigurez les secrets Replit avant d\'utiliser le script.');
      console.log('Allez dans: Secrets (panneau de gauche) > Add Secret');
      console.log('');
    }
    
    const current = await this.getCurrentConfig();
    
    if (current.config) {
      console.log(`🎯 Environnement actuel: ${current.config.name}`);
      console.log(`🔗 URL: ${current.config.url || '❌ Non configurée'}`);
      console.log(`🏷️ Type: ${current.config.env}`);
      console.log(`📝 Description: ${current.config.description}`);
    } else {
      console.log('⚠️ Configuration non reconnue ou fichier .env manquant');
    }
    
    console.log('\n========== ENVIRONNEMENTS DISPONIBLES ==========');
    for (const [env, config] of Object.entries(DATABASE_CONFIGS)) {
      const isCurrent = current.config && current.config.url === config.url;
      const isConfigured = config.url && config.anon_key && config.service_role_key;
      
      console.log(`${isCurrent ? '👉' : '  '} ${env}: ${config.name} ${isConfigured ? '✅' : '❌ Non configuré'}`);
      console.log(`     URL: ${config.url || '❌ Manquante'}`);
      console.log(`     Clé anon: ${config.anon_key ? '✅ Configurée' : '❌ Manquante'}`);
      console.log(`     Clé service: ${config.service_role_key ? '✅ Configurée' : '❌ Manquante'}`);
      console.log(`     Description: ${config.description}`);
      console.log('');
    }
    
    console.log('========== UTILISATION ==========');
    console.log('node switch-database.js production    # Basculer vers production');
    console.log('node switch-database.js development   # Basculer vers développement');
    console.log('node switch-database.js status        # Afficher ce statut');
    console.log('===============================\n');
  }
}

// Fonction principale
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const switcher = new DatabaseSwitcher();
  
  try {
    switch (command) {
      case 'production':
      case 'prod':
        await switcher.switchTo('production');
        break;
        
      case 'development':
      case 'dev':
        await switcher.switchTo('development');
        break;
        
      case 'status':
      case undefined:
        await switcher.showStatus();
        break;
        
      default:
        console.error(`❌ Commande inconnue: ${command}`);
        console.error('Usage: node switch-database.js [production|development|status]');
        process.exit(1);
    }
    
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    process.exit(1);
  }
}

// Exécution si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DatabaseSwitcher, DATABASE_CONFIGS };