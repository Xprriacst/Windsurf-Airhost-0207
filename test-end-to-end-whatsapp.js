// Test automatisé end-to-end pour valider le fonctionnement complet du toggle WhatsApp
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import puppeteer from 'puppeteer';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const HOST_ID = 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7';
const EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1/create-conversation-with-welcome`;
const APP_URL = 'https://airhost-rec.netlify.app/login';
const LOGIN_EMAIL = 'contact.polaris.ia@gmail.com';
const LOGIN_PASSWORD = 'Airhost123;';

const ZAPIER_PAYLOAD = {
  host_id: HOST_ID,
  guest_name: 'meo',
  guest_phone: '+33784585116',
  property_id: '968070e6-e6ee-41d9-a3b0-c6365bff2097',
  check_in_date: '2025-06-21',
  check_out_date: '2025-06-22',
  send_welcome_template: true,
  welcome_template_name: 'hello_world'
};

const ZAPIER_HEADERS = {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeGtocnRsY2N4dWJ2amdleG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5OTc0MjEsImV4cCI6MjA2MzU3MzQyMX0.Bw3EecPS7gH61udufLAipWZGDbJzC2sb-D890w_iIds',
  'Content-Type': 'application/json'
};

async function step1_deleteConversations() {
  console.log('🗑️ ÉTAPE 1: Suppression des conversations existantes');
  console.log('================================================');
  
  try {
    // Rechercher les conversations existantes
    const { data: conversations, error: searchError } = await supabase
      .from('conversations')
      .select('id')
      .eq('property_id', ZAPIER_PAYLOAD.property_id)
      .eq('guest_phone', ZAPIER_PAYLOAD.guest_phone);
    
    if (searchError) {
      console.error('❌ Erreur recherche conversations:', searchError.message);
      return false;
    }
    
    if (conversations && conversations.length > 0) {
      console.log(`✓ ${conversations.length} conversation(s) trouvée(s) à supprimer`);
      
      // Supprimer les messages puis les conversations
      for (const conv of conversations) {
        await supabase.from('messages').delete().eq('conversation_id', conv.id);
        await supabase.from('conversations').delete().eq('id', conv.id);
      }
      
      console.log('✅ Conversations supprimées avec succès');
    } else {
      console.log('ℹ️ Aucune conversation existante trouvée');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error);
    return false;
  }
}

async function step2_disableToggleViaInterface() {
  console.log('\n🔧 ÉTAPE 2: Désactivation du toggle via l\'interface');
  console.log('==================================================');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false, // Mode visible pour voir ce qui se passe
      defaultViewport: { width: 1280, height: 720 }
    });
    
    const page = await browser.newPage();
    
    // Aller sur l'application avec retry
    console.log('🌐 Navigation vers l\'application...');
    let retries = 3;
    while (retries > 0) {
      try {
        await page.goto(APP_URL, { 
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        break;
      } catch (error) {
        retries--;
        console.log(`⚠️ Erreur de navigation, tentatives restantes: ${retries}`);
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Gérer la popup de notifications si elle apparaît
    try {
      await page.waitForSelector('[data-testid="notification-permission"]', { timeout: 3000 });
      await page.click('[data-testid="notification-permission"] button');
      console.log('✓ Popup de notifications gérée');
    } catch (e) {
      console.log('ℹ️ Pas de popup de notifications');
    }
    
    // Se connecter
    console.log('🔐 Connexion...');
    try {
      // Vérifier si on est sur la page de login
      await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
      
      // Remplir les champs de connexion
      await page.type('input[type="email"], input[name="email"]', LOGIN_EMAIL);
      await page.type('input[type="password"], input[name="password"]', LOGIN_PASSWORD);
      
      // Cliquer sur le bouton de connexion
      const loginButton = await page.$('button[type="submit"]') || 
                         await page.evaluateHandle(() => {
                           const buttons = Array.from(document.querySelectorAll('button'));
                           return buttons.find(btn => 
                             btn.textContent.toLowerCase().includes('connexion') ||
                             btn.textContent.toLowerCase().includes('connecter') ||
                             btn.textContent.toLowerCase().includes('login')
                           );
                         });
      
      if (loginButton) {
        await loginButton.click();
      } else {
        throw new Error('Bouton de connexion non trouvé');
      }
      
      // Attendre la redirection vers le dashboard
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
      console.log('✅ Connexion réussie');
      
    } catch (e) {
      console.log('⚠️ Tentative de gestion d\'une session existante...');
      
      // Si déjà connecté, essayer de se déconnecter d'abord
      try {
        await page.goto('https://airhost-rec.netlify.app/logout', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.goto(APP_URL, { waitUntil: 'networkidle2' });
        
        // Réessayer la connexion
        await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
        await page.type('input[type="email"], input[name="email"]', LOGIN_EMAIL);
        await page.type('input[type="password"], input[name="password"]', LOGIN_PASSWORD);
        await page.click('button[type="submit"], button:contains("Connexion"), button:contains("Se connecter")');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
        console.log('✅ Connexion réussie après déconnexion');
        
      } catch (e2) {
        console.error('❌ Impossible de se connecter:', e2.message);
        throw e2;
      }
    }
    
    // Aller dans les paramètres WhatsApp
    console.log('⚙️ Accès aux paramètres WhatsApp...');
    
    // Chercher le bouton de configuration WhatsApp
    console.log('🔍 Recherche du bouton de configuration WhatsApp...');
    
    let configButton = await page.$('[data-testid="whatsapp-config-button"]');
    
    if (!configButton) {
      // Chercher par texte
      configButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        return buttons.find(btn => 
          btn.textContent.toLowerCase().includes('whatsapp') ||
          btn.textContent.toLowerCase().includes('configuration') ||
          btn.textContent.toLowerCase().includes('paramètres')
        );
      });
    }
    
    if (!configButton) {
      throw new Error('Bouton de configuration WhatsApp non trouvé');
    }
    
    await configButton.click();
    console.log('✓ Bouton de configuration cliqué');
    
    // Attendre que la modal s'ouvre
    await page.waitForSelector('[role="dialog"], .modal, .MuiDialog-root', { timeout: 5000 });
    console.log('✓ Modal de configuration ouverte');
    
    // Trouver et désactiver le toggle
    const toggleSelector = 'input[type="checkbox"], .MuiSwitch-input';
    await page.waitForSelector(toggleSelector, { timeout: 5000 });
    
    const isToggleChecked = await page.$eval(toggleSelector, el => el.checked);
    
    if (isToggleChecked) {
      await page.click(toggleSelector);
      console.log('✅ Toggle désactivé');
    } else {
      console.log('ℹ️ Toggle déjà désactivé');
    }
    
    // Sauvegarder
    const saveButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => 
        btn.textContent.toLowerCase().includes('enregistrer') ||
        btn.textContent.toLowerCase().includes('sauvegarder') ||
        btn.textContent.toLowerCase().includes('save')
      );
    });
    
    if (saveButton) {
      await saveButton.click();
      console.log('✓ Bouton de sauvegarde cliqué');
    } else {
      console.log('⚠️ Bouton de sauvegarde non trouvé, tentative avec sélecteur générique');
      await page.click('button[type="submit"]');
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Attendre la sauvegarde
    
    console.log('✅ Configuration sauvegardée');
    
    await browser.close();
    return true;
    
  } catch (error) {
    console.error('❌ Erreur lors de la désactivation du toggle:', error);
    if (browser) await browser.close();
    return false;
  }
}

async function step3_simulateZapierRequest(testName) {
  console.log(`\n📡 ÉTAPE 3: Simulation requête Zapier (${testName})`);
  console.log('===============================================');
  
  try {
    console.log('📤 Envoi de la requête...');
    console.log('Payload:', JSON.stringify(ZAPIER_PAYLOAD, null, 2));
    
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: ZAPIER_HEADERS,
      body: JSON.stringify(ZAPIER_PAYLOAD)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Erreur HTTP:', response.status, result);
      return null;
    }
    
    console.log('✅ Requête réussie');
    console.log('📋 Résultat:', {
      conversation_id: result.conversation?.id,
      message: result.message,
      welcome_template_sent: result.welcome_template_sent,
      welcome_template_error: result.welcome_template_error
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Erreur lors de la simulation Zapier:', error);
    return null;
  }
}

async function step4_enableToggleViaInterface() {
  console.log('\n🔧 ÉTAPE 4: Activation du toggle via l\'interface');
  console.log('================================================');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: { width: 1280, height: 720 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });
    
    const page = await browser.newPage();
    
    // Aller sur l'application avec retry
    console.log('🌐 Navigation vers l\'application...');
    let retries = 3;
    while (retries > 0) {
      try {
        await page.goto(APP_URL, { 
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        break;
      } catch (error) {
        retries--;
        console.log(`⚠️ Erreur de navigation, tentatives restantes: ${retries}`);
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Se connecter (même logique que step2)
    console.log('🔐 Vérification de la connexion...');
    try {
      // Vérifier si on est sur la page de login
      await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
      
      // Remplir les champs de connexion
      await page.type('input[type="email"], input[name="email"]', LOGIN_EMAIL);
      await page.type('input[type="password"], input[name="password"]', LOGIN_PASSWORD);
      
      // Cliquer sur le bouton de connexion
      const loginButton = await page.$('button[type="submit"]') || 
                         await page.evaluateHandle(() => {
                           const buttons = Array.from(document.querySelectorAll('button'));
                           return buttons.find(btn => 
                             btn.textContent.toLowerCase().includes('connexion') ||
                             btn.textContent.toLowerCase().includes('connecter') ||
                             btn.textContent.toLowerCase().includes('login')
                           );
                         });
      
      if (loginButton) {
        await loginButton.click();
      } else {
        throw new Error('Bouton de connexion non trouvé');
      }
      
      // Attendre la redirection
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
      console.log('✅ Connexion réussie');
      
    } catch (e) {
      console.log('⚠️ Gestion session existante...');
      
      try {
        await page.goto('https://airhost-rec.netlify.app/logout', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.goto(APP_URL, { waitUntil: 'networkidle2' });
        
        await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
        await page.type('input[type="email"], input[name="email"]', LOGIN_EMAIL);
        await page.type('input[type="password"], input[name="password"]', LOGIN_PASSWORD);
        await page.click('button[type="submit"], button:contains("Connexion"), button:contains("Se connecter")');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
        console.log('✅ Connexion réussie après déconnexion');
        
      } catch (e2) {
        console.error('❌ Impossible de se connecter:', e2.message);
        throw e2;
      }
    }
    
    // Aller dans les paramètres WhatsApp
    console.log('⚙️ Accès aux paramètres WhatsApp...');
    console.log('🔍 Recherche du bouton de configuration WhatsApp...');
    
    let configButton = await page.$('[data-testid="whatsapp-config-button"]');
    
    if (!configButton) {
      // Chercher par texte
      configButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        return buttons.find(btn => 
          btn.textContent.toLowerCase().includes('whatsapp') ||
          btn.textContent.toLowerCase().includes('configuration') ||
          btn.textContent.toLowerCase().includes('paramètres')
        );
      });
    }
    
    if (!configButton) {
      throw new Error('Bouton de configuration WhatsApp non trouvé');
    }
    
    await configButton.click();
    console.log('✓ Bouton de configuration cliqué');
    
    await page.waitForSelector('[role="dialog"], .modal, .MuiDialog-root', { timeout: 5000 });
    console.log('✓ Modal de configuration ouverte');
    
    // Trouver et activer le toggle
    const toggleSelector = 'input[type="checkbox"], .MuiSwitch-input';
    await page.waitForSelector(toggleSelector, { timeout: 5000 });
    
    const isToggleChecked = await page.$eval(toggleSelector, el => el.checked);
    
    if (!isToggleChecked) {
      await page.click(toggleSelector);
      console.log('✅ Toggle activé');
    } else {
      console.log('ℹ️ Toggle déjà activé');
    }
    
    // Sauvegarder
    const saveButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => 
        btn.textContent.toLowerCase().includes('enregistrer') ||
        btn.textContent.toLowerCase().includes('sauvegarder') ||
        btn.textContent.toLowerCase().includes('save')
      );
    });
    
    if (saveButton) {
      await saveButton.click();
      console.log('✓ Bouton de sauvegarde cliqué');
    } else {
      console.log('⚠️ Bouton de sauvegarde non trouvé, tentative avec sélecteur générique');
      await page.click('button[type="submit"]');
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Configuration sauvegardée');
    
    await browser.close();
    return true;
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'activation du toggle:', error);
    if (browser) await browser.close();
    return false;
  }
}

async function verifyDatabaseConfig(expectedToggleState) {
  console.log(`\n🔍 Vérification de la configuration en base (toggle attendu: ${expectedToggleState})`);
  
  const { data: config, error } = await supabase
    .from('whatsapp_template_config')
    .select('auto_templates_enabled, send_welcome_template, welcome_template_name')
    .eq('host_id', HOST_ID)
    .single();
  
  if (error) {
    console.error('❌ Erreur récupération config:', error.message);
    return false;
  }
  
  console.log('📋 Configuration actuelle:');
  console.log(`   auto_templates_enabled: ${config.auto_templates_enabled}`);
  console.log(`   send_welcome_template: ${config.send_welcome_template}`);
  console.log(`   welcome_template_name: ${config.welcome_template_name}`);
  
  const isCorrect = config.auto_templates_enabled === expectedToggleState;
  console.log(isCorrect ? '✅ Configuration correcte' : '❌ Configuration incorrecte');
  
  return isCorrect;
}

async function runCompleteTest() {
  console.log('🚀 TEST END-TO-END WHATSAPP - AUTOMATISATION COMPLÈTE');
  console.log('=====================================================');
  console.log(`📧 Hôte testé: ${HOST_ID} (${LOGIN_EMAIL})`);
  console.log(`🌐 Application: ${APP_URL}`);
  console.log(`📡 Edge Function: ${EDGE_FUNCTION_URL}`);
  
  const results = {
    step1: false,
    step2: false,
    step3_off: null,
    step4: false,
    step5_on: null,
    verification_off: false,
    verification_on: false
  };
  
  try {
    // ÉTAPE 1: Supprimer les conversations
    results.step1 = await step1_deleteConversations();
    if (!results.step1) {
      console.log('❌ Échec étape 1, arrêt du test');
      return;
    }
    
    // ÉTAPE 2: Désactiver le toggle
    results.step2 = await step2_disableToggleViaInterface();
    if (!results.step2) {
      console.log('❌ Échec étape 2, arrêt du test');
      return;
    }
    
    // Vérifier que la config est bien désactivée
    results.verification_off = await verifyDatabaseConfig(false);
    
    // ÉTAPE 3: Simuler Zapier avec toggle OFF
    results.step3_off = await step3_simulateZapierRequest('Toggle OFF');
    
    // ÉTAPE 3.5: Supprimer les conversations avant le test toggle ON
    console.log('\n🗑️ ÉTAPE 3.5: Suppression des conversations avant test toggle ON');
    console.log('=============================================================');
    await step1_deleteConversations();
    
    // ÉTAPE 4: Activer le toggle via l'interface
    const step4Result = await step4_enableToggleViaInterface();
    if (!step4Result.success) {
      console.log('❌ Échec étape 4, arrêt du test');
      return;
    }
    
    // Vérifier que la config est bien activée
    results.verification_on = await verifyDatabaseConfig(true);
    
    // ÉTAPE 5: Simuler Zapier avec toggle ON
    results.step5_on = await step3_simulateZapierRequest('Toggle ON');
    
    // ANALYSE FINALE
    console.log('\n📊 ANALYSE FINALE DES RÉSULTATS');
    console.log('===============================');
    
    console.log('\n🔍 Résultats par étape:');
    console.log(`   1. Suppression conversations: ${results.step1 ? '✅' : '❌'}`);
    console.log(`   2. Désactivation toggle: ${results.step2 ? '✅' : '❌'}`);
    console.log(`   3. Vérification config OFF: ${results.verification_off ? '✅' : '❌'}`);
    console.log(`   4. Test Zapier (toggle OFF): ${results.step3_off ? (results.step3_off.welcome_template_sent ? '❌ Template envoyé (ne devrait pas)' : '✅ Template PAS envoyé') : '❌ Erreur'}`);
    console.log(`   5. Activation toggle: ${results.step4 ? '✅' : '❌'}`);
    console.log(`   6. Vérification config ON: ${results.verification_on ? '✅' : '❌'}`);
    console.log(`   7. Test Zapier (toggle ON): ${results.step5_on ? (results.step5_on.welcome_template_sent ? '✅ Template envoyé' : '❌ Template PAS envoyé (devrait être envoyé)') : '❌ Erreur'}`);
    
    // Validation finale
    const toggleOffWorking = results.step3_off && !results.step3_off.welcome_template_sent;
    const toggleOnWorking = results.step5_on && results.step5_on.welcome_template_sent;
    
    console.log('\n🎯 VALIDATION FINALE:');
    console.log(`   Toggle OFF fonctionne: ${toggleOffWorking ? '✅' : '❌'}`);
    console.log(`   Toggle ON fonctionne: ${toggleOnWorking ? '✅' : '❌'}`);
    
    if (toggleOffWorking && toggleOnWorking) {
      console.log('\n🎉 SUCCÈS COMPLET! Le système WhatsApp fonctionne parfaitement.');
      console.log('✅ Le toggle contrôle correctement l\'envoi des templates.');
      console.log('✅ L\'interface et la base de données sont synchronisées.');
      console.log('✅ Les requêtes Zapier sont traitées correctement.');
    } else {
      console.log('\n⚠️ PROBLÈMES DÉTECTÉS:');
      if (!toggleOffWorking) {
        console.log('❌ Le toggle OFF ne fonctionne pas correctement');
      }
      if (!toggleOnWorking) {
        console.log('❌ Le toggle ON ne fonctionne pas correctement');
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur générale du test:', error);
  }
}

// Lancer le test complet
runCompleteTest();
