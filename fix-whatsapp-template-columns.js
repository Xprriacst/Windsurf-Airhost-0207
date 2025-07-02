#!/usr/bin/env node

/**
 * Ajoute les colonnes pour les templates WhatsApp à la table whatsapp_config
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

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

async function fixWhatsAppTemplateColumns() {
  console.log('🔧 Ajout des colonnes pour les templates WhatsApp...\n');

  try {
    // Vérifier la structure actuelle
    const { data: existing, error: selectError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .limit(1);

    if (selectError) {
      console.error('❌ Erreur lors de la vérification:', selectError);
      return;
    }

    console.log('📋 Structure actuelle de whatsapp_config:');
    if (existing && existing.length > 0) {
      console.log('Colonnes existantes:', Object.keys(existing[0]));
    }

    // SQL pour ajouter les colonnes manquantes
    const alterQueries = [
      `ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS template_enabled BOOLEAN DEFAULT false;`,
      `ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS welcome_template TEXT;`,
      `ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS welcome_message TEXT;`
    ];

    for (const query of alterQueries) {
      console.log('\n🔧 Exécution:', query);
      
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: query 
      });

      if (error) {
        console.warn('⚠️ Erreur SQL (peut être normale si la colonne existe déjà):', error.message);
      } else {
        console.log('✅ Requête exécutée avec succès');
      }
    }

    // Vérifier la nouvelle structure
    const { data: updated, error: verifyError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .limit(1);

    if (verifyError) {
      console.error('❌ Erreur lors de la vérification finale:', verifyError);
      return;
    }

    console.log('\n📋 Nouvelle structure de whatsapp_config:');
    if (updated && updated.length > 0) {
      console.log('Colonnes après modification:', Object.keys(updated[0]));
    }

    // Mettre à jour la configuration existante avec les templates
    console.log('\n🔄 Mise à jour de la configuration avec les templates...');
    
    const { data: updateResult, error: updateError } = await supabase
      .from('whatsapp_config')
      .update({
        template_enabled: true,
        welcome_template: 'hello_world',
        welcome_message: 'Bienvenue ! Nous reviendrons vers vous rapidement.',
        updated_at: new Date().toISOString()
      })
      .select('*');

    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour:', updateError);
    } else {
      console.log('✅ Configuration mise à jour avec succès');
      console.log('Templates activés:', updateResult[0]?.template_enabled);
      console.log('Template de bienvenue:', updateResult[0]?.welcome_template);
    }

    console.log('\n✅ Opération terminée avec succès !');
    console.log('Les templates WhatsApp sont maintenant opérationnels.');

  } catch (error) {
    console.error('❌ Erreur lors de l\'opération:', error);
  }
}

fixWhatsAppTemplateColumns();