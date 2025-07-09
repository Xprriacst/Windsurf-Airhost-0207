import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const HOST_ID = 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7';
const APP_URL = 'https://airhost-rec.netlify.app';

async function checkToggleInDatabase() {
  const { data, error } = await supabase
    .from('whatsapp_template_config')
    .select('auto_templates_enabled, send_welcome_template, welcome_template_name, updated_at')
    .eq('host_id', HOST_ID)
    .single();
  
  if (error) {
    console.error('❌ Erreur lors de la vérification en base:', error);
    return null;
  }
  
  return data;
}

async function testToggleSync() {
  console.log('🚀 TEST DE SYNCHRONISATION DU TOGGLE WHATSAPP');
  console.log('='.repeat(60));
  
  // Vérification initiale de la base
  console.log('\n📊 ÉTAT INITIAL DE LA BASE');
  console.log('='.repeat(30));
  const initialState = await checkToggleInDatabase();
  if (initialState) {
    console.log('📋 Configuration actuelle:', initialState);
  }
  
  const browser = await puppeteer.launch({
    headless: false, // Mode visible pour le débogage
    devtools: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // Capturer tous les logs de la console
    const consoleLogs = [];
    page.on('console', msg => {
      const logEntry = `[${msg.type().toUpperCase()}] ${msg.text()}`;
      consoleLogs.push(logEntry);
      console.log('🖥️ Console:', logEntry);
    });
    
    // Capturer les erreurs
    page.on('pageerror', error => {
      console.error('❌ Erreur page:', error.message);
    });
    
    console.log('\n🌐 NAVIGATION VERS L\'APPLICATION');
    console.log('='.repeat(40));
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✅ Page chargée');
    
    // Attendre que la page soit complètement chargée
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n🔧 OUVERTURE DE LA CONFIGURATION WHATSAPP');
    console.log('='.repeat(45));
    
    // Cliquer sur le bouton de configuration WhatsApp
    // Le bouton est dans la sidebar, on cherche par le texte
    const whatsappButton = await page.evaluateHandle(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements.find(el => el.textContent && el.textContent.includes('Configuration WhatsApp') && el.tagName !== 'TITLE');
    });
    
    if (!whatsappButton.asElement()) {
      throw new Error('❌ Bouton Configuration WhatsApp non trouvé');
    }
    
    await whatsappButton.asElement().click();
    console.log('✅ Bouton configuration cliqué');
    
    // Attendre que la modal s'ouvre
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    console.log('✅ Modal WhatsApp ouverte');
    
    // Attendre que le contenu se charge
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n🔍 VÉRIFICATION DE L\'ÉTAT INITIAL DU TOGGLE');
    console.log('='.repeat(50));
    
    // Vérifier l'état initial du toggle
    const initialToggleState = await page.evaluate(() => {
      const toggle = document.querySelector('input[type="checkbox"]');
      return toggle ? toggle.checked : null;
    });
    
    console.log(`📊 Toggle initial dans l'UI: ${initialToggleState}`);
    
    console.log('\n🔄 TEST 1: DÉSACTIVATION DU TOGGLE');
    console.log('='.repeat(40));
    
    // Si le toggle est activé, le désactiver
    if (initialToggleState) {
      await page.click('input[type="checkbox"]');
      console.log('✅ Toggle désactivé dans l\'UI');
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('ℹ️ Toggle déjà désactivé');
    }
    
    // Sauvegarder
    await page.click('button:has-text("Enregistrer")');
    console.log('✅ Bouton Enregistrer cliqué');
    
    // Attendre la sauvegarde
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Vérifier en base après désactivation
    console.log('\n📊 VÉRIFICATION EN BASE APRÈS DÉSACTIVATION');
    console.log('='.repeat(50));
    const stateAfterOff = await checkToggleInDatabase();
    if (stateAfterOff) {
      console.log('📋 Configuration après OFF:', stateAfterOff);
      console.log(`🎯 Toggle en base: ${stateAfterOff.auto_templates_enabled} (attendu: false)`);
    }
    
    // Fermer et rouvrir la modal pour tester la persistance
    await page.click('button[aria-label="Close"]');
    await page.waitForTimeout(1000);
    
    console.log('\n🔄 TEST 2: ACTIVATION DU TOGGLE');
    console.log('='.repeat(35));
    
    // Rouvrir la modal
    await page.click('button[aria-label="Configuration WhatsApp"]');
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Activer le toggle
    const currentToggleState = await page.evaluate(() => {
      const toggle = document.querySelector('input[type="checkbox"]');
      return toggle ? toggle.checked : null;
    });
    
    console.log(`📊 Toggle actuel dans l'UI: ${currentToggleState}`);
    
    if (!currentToggleState) {
      await page.click('input[type="checkbox"]');
      console.log('✅ Toggle activé dans l\'UI');
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('ℹ️ Toggle déjà activé');
    }
    
    // Sauvegarder
    await page.click('button:has-text("Enregistrer")');
    console.log('✅ Bouton Enregistrer cliqué');
    
    // Attendre la sauvegarde
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Vérifier en base après activation
    console.log('\n📊 VÉRIFICATION EN BASE APRÈS ACTIVATION');
    console.log('='.repeat(50));
    const stateAfterOn = await checkToggleInDatabase();
    if (stateAfterOn) {
      console.log('📋 Configuration après ON:', stateAfterOn);
      console.log(`🎯 Toggle en base: ${stateAfterOn.auto_templates_enabled} (attendu: true)`);
    }
    
    console.log('\n📋 RÉSUMÉ DES LOGS CONSOLE');
    console.log('='.repeat(40));
    consoleLogs.forEach((log, index) => {
      console.log(`${index + 1}. ${log}`);
    });
    
    console.log('\n🎯 ANALYSE DES RÉSULTATS');
    console.log('='.repeat(35));
    
    const offTestPassed = stateAfterOff && !stateAfterOff.auto_templates_enabled;
    const onTestPassed = stateAfterOn && stateAfterOn.auto_templates_enabled;
    
    console.log(`Toggle OFF: ${offTestPassed ? '✅ SUCCÈS' : '❌ ÉCHEC'}`);
    console.log(`Toggle ON:  ${onTestPassed ? '✅ SUCCÈS' : '❌ ÉCHEC'}`);
    
    if (offTestPassed && onTestPassed) {
      console.log('\n🎉 SYNCHRONISATION TOGGLE RÉUSSIE !');
    } else {
      console.log('\n🚨 PROBLÈME DE SYNCHRONISATION DÉTECTÉ');
      console.log('📝 Vérifiez les logs de console ci-dessus pour diagnostiquer');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    await browser.close();
  }
}

testToggleSync().catch(console.error);
