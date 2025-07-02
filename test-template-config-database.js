#!/usr/bin/env node

/**
 * Test de la configuration des templates WhatsApp dans la base de données
 * Vérifie pourquoi les templates ne s'envoient pas automatiquement
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Charger les variables d'environnement
if (fs.existsSync('.env')) {
  dotenv.config();
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pnbfsiicxhckptlgtjoj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquant');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testTemplateConfig() {
  console.log('🔍 Vérification de la configuration des templates WhatsApp...\n');

  try {
    // 1. Vérifier la configuration actuelle
    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (configError) {
      console.error('❌ Erreur lors de la récupération de la configuration:', configError);
      return;
    }

    console.log('📋 Configuration WhatsApp actuelle:');
    console.log('  Phone Number ID:', config.phone_number_id || 'Non défini');
    console.log('  Token présent:', !!config.token);
    console.log('  Templates activés:', config.template_enabled || false);
    console.log('  Template de bienvenue:', config.welcome_template || 'Non défini');
    console.log('  Message personnalisé:', config.welcome_message || 'Non défini');
    console.log('  Dernière mise à jour:', config.updated_at);
    console.log();

    // 2. Identifier les problèmes
    const problems = [];
    
    if (!config.token) {
      problems.push('Token WhatsApp manquant');
    }
    
    if (!config.phone_number_id) {
      problems.push('Phone Number ID manquant');
    }
    
    if (!config.template_enabled) {
      problems.push('Templates désactivés');
    }
    
    if (!config.welcome_template) {
      problems.push('Nom du template de bienvenue non défini');
    }

    if (problems.length > 0) {
      console.log('❌ Problèmes identifiés:');
      problems.forEach(problem => console.log(`  - ${problem}`));
      console.log();
    } else {
      console.log('✅ Configuration des templates semble correcte');
      console.log();
    }

    // 3. Tester la création d'une conversation avec template
    if (problems.length === 0) {
      console.log('🧪 Test de création de conversation avec template...');
      
      const testPayload = {
        guest_name: 'Test Template Database',
        guest_phone: '+33617370777',
        property_id: 'a0624296-4e92-469c-9be2-dcbe8ff547c2',
        host_id: 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7',
        check_in_date: '2025-06-25',
        check_out_date: '2025-06-30'
      };

      const response = await fetch('http://localhost:3002/create-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload)
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Conversation créée avec succès');
        console.log('  ID conversation:', result.conversation?.id);
        
        if (result.welcomeMessage) {
          if (result.welcomeMessage.success) {
            console.log('✅ Template WhatsApp envoyé avec succès');
            console.log('  Message ID:', result.welcomeMessage.messageId);
          } else {
            console.log('❌ Échec de l\'envoi du template:', result.welcomeMessage.reason);
          }
        } else {
          console.log('⚠️ Aucune tentative d\'envoi de template détectée');
        }
      } else {
        console.log('❌ Erreur lors de la création de conversation:', result.error || result.message);
      }
    }

    // 4. Proposer des solutions
    console.log('\n🔧 Solutions recommandées:');
    
    if (problems.includes('Templates désactivés')) {
      console.log('  1. Activer les templates via l\'interface utilisateur');
    }
    
    if (problems.includes('Nom du template de bienvenue non défini')) {
      console.log('  2. Configurer le nom du template (ex: "hello_world") dans l\'interface');
    }
    
    if (problems.includes('Token WhatsApp manquant') || problems.includes('Phone Number ID manquant')) {
      console.log('  3. Configurer les tokens WhatsApp via l\'interface utilisateur');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testTemplateConfig();