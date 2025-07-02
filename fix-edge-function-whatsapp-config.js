#!/usr/bin/env node

/**
 * Correction de la configuration WhatsApp pour l'edge function Supabase
 * Crée la table whatsapp_config et copie la configuration depuis la base de développement
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Charger les variables d'environnement
if (fs.existsSync('.env')) {
  dotenv.config();
}

// Configuration base de développement (source)
const devSupabase = createClient(
  'https://whxkhrtlccxubvjgexmi.supabase.co',
  process.env.DEV_SUPABASE_SERVICE_ROLE_KEY
);

// Configuration edge function (destination)
const edgeSupabase = createClient(
  'https://whxkhrtlccxubvjgexmi.supabase.co',
  process.env.DEV_SUPABASE_SERVICE_ROLE_KEY
);

async function createWhatsAppConfigTable() {
  console.log('1️⃣ Création de la table whatsapp_config...');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS whatsapp_config (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      host_id uuid REFERENCES auth.users(id),
      phone_number_id text,
      token text,
      business_account_id text,
      webhook_url text,
      webhook_verify_token text,
      templates_enabled boolean DEFAULT false,
      welcome_template_name text,
      welcome_template_enabled boolean DEFAULT false,
      created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  `;
  
  try {
    const { error } = await edgeSupabase.rpc('exec_sql', { sql: createTableSQL });
    if (error && !error.message.includes('already exists')) {
      throw error;
    }
    console.log('✅ Table whatsapp_config créée avec succès');
  } catch (error) {
    console.log('❌ Erreur création table:', error.message);
    // Continuons quand même, la table existe peut-être déjà
  }
}

async function copyWhatsAppConfig() {
  console.log('2️⃣ Récupération de la configuration depuis la base dev...');
  
  // Récupérer la configuration de la base dev
  const { data: devConfig, error: devError } = await devSupabase
    .from('whatsapp_config')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();
    
  if (devError || !devConfig) {
    console.log('❌ Erreur récupération config dev:', devError?.message || 'Aucune config trouvée');
    return;
  }
  
  console.log('✅ Configuration dev récupérée:', {
    host_id: devConfig.host_id,
    phone_number_id: devConfig.phone_number_id ? '***' + devConfig.phone_number_id.slice(-4) : null,
    hasToken: !!devConfig.token
  });
  
  console.log('3️⃣ Insertion de la configuration dans l\'edge function...');
  
  // Vérifier si la config existe déjà
  const { data: existing } = await edgeSupabase
    .from('whatsapp_config')
    .select('id')
    .eq('host_id', devConfig.host_id)
    .single();
    
  if (existing) {
    // Mettre à jour
    const { error: updateError } = await edgeSupabase
      .from('whatsapp_config')
      .update({
        phone_number_id: devConfig.phone_number_id,
        token: devConfig.token,
        business_account_id: devConfig.business_account_id,
        webhook_url: devConfig.webhook_url,
        webhook_verify_token: devConfig.webhook_verify_token,
        templates_enabled: devConfig.templates_enabled,
        welcome_template_name: devConfig.welcome_template_name,
        welcome_template_enabled: devConfig.welcome_template_enabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);
      
    if (updateError) {
      console.log('❌ Erreur mise à jour:', updateError.message);
      return;
    }
    console.log('✅ Configuration mise à jour avec succès');
  } else {
    // Insérer nouvelle config
    const { error: insertError } = await edgeSupabase
      .from('whatsapp_config')
      .insert([{
        host_id: devConfig.host_id,
        phone_number_id: devConfig.phone_number_id,
        token: devConfig.token,
        business_account_id: devConfig.business_account_id,
        webhook_url: devConfig.webhook_url,
        webhook_verify_token: devConfig.webhook_verify_token,
        templates_enabled: devConfig.templates_enabled,
        welcome_template_name: devConfig.welcome_template_name,
        welcome_template_enabled: devConfig.welcome_template_enabled
      }]);
      
    if (insertError) {
      console.log('❌ Erreur insertion:', insertError.message);
      return;
    }
    console.log('✅ Configuration insérée avec succès');
  }
}

async function testEdgeFunctionConfig() {
  console.log('4️⃣ Test de la configuration edge function...');
  
  const { data: config, error } = await edgeSupabase
    .from('whatsapp_config')
    .select('phone_number_id, token')
    .not('token', 'is', null)
    .neq('token', '')
    .not('phone_number_id', 'is', null)
    .neq('phone_number_id', '')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();
    
  if (error || !config) {
    console.log('❌ Configuration non trouvée:', error?.message);
    return false;
  }
  
  console.log('✅ Configuration edge function validée:', {
    phone_number_id: config.phone_number_id ? '***' + config.phone_number_id.slice(-4) : null,
    hasToken: !!config.token
  });
  
  return true;
}

async function testTemplateWithEdgeFunction() {
  console.log('5️⃣ Test d\'envoi de template avec edge function...');
  
  try {
    const response = await fetch('https://whxkhrtlccxubvjgexmi.supabase.co/functions/v1/create-conversation-with-welcome', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEV_SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        host_id: 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7',
        guest_name: 'Test Config Fix',
        guest_phone: '+33617370499',
        property_id: 'a0624296-4e92-469c-9be2-dcbe8ff547c2',
        check_in_date: '2025-06-25',
        check_out_date: '2025-06-26',
        send_welcome_template: true,
        welcome_template_name: 'hello_world'
      })
    });
    
    const result = await response.json();
    console.log('📋 Réponse edge function:', JSON.stringify(result, null, 2));
    
    if (result.welcomeMessage && result.welcomeMessage.success) {
      console.log('🎉 Template envoyé avec succès ! Message ID:', result.welcomeMessage.messageId);
      return true;
    } else if (result.welcome_template_error) {
      console.log('⚠️ Erreur template:', result.welcome_template_error);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Erreur test edge function:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 Correction de la configuration WhatsApp pour edge function\n');
  
  try {
    await createWhatsAppConfigTable();
    await copyWhatsAppConfig();
    
    const configValid = await testEdgeFunctionConfig();
    if (configValid) {
      const templateSuccess = await testTemplateWithEdgeFunction();
      
      if (templateSuccess) {
        console.log('\n🎉 Configuration edge function corrigée avec succès !');
        console.log('✅ L\'edge function peut maintenant envoyer des templates automatiquement');
        console.log('🔗 URL Zapier: https://whxkhrtlccxubvjgexmi.supabase.co/functions/v1/create-conversation-with-welcome');
      } else {
        console.log('\n⚠️ Configuration copiée mais templates non fonctionnels');
        console.log('💡 Utilisez le service local pour les templates: http://localhost:3002/create-conversation');
      }
    }
    
  } catch (error) {
    console.log('❌ Erreur générale:', error.message);
  }
}

main();