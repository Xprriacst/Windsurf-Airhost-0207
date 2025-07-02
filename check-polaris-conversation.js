#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Configuration depuis les variables d'environnement
const supabaseUrl = 'https://pnbfsiicxhckptlgtjoj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuYmZzaWljeGhja3B0bGd0am9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY2NTUwMiwiZXhwIjoyMDYzMjQxNTAyfQ.DPKTpahAzRv1X3crxS81XhmLSzbW8fUbAQ22Ru0GFdc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPolarisConversations() {
  console.log('🔍 Vérification des conversations Contact Polaris IA...\n');

  try {
    // 1. Rechercher toutes les conversations avec "Contact Polaris" dans le nom
    const { data: polarisConversations, error: polarisError } = await supabase
      .from('conversations')
      .select('*')
      .ilike('guest_name', '%Contact Polaris%')
      .order('created_at', { ascending: false });

    if (polarisError) {
      console.error('Erreur recherche Polaris:', polarisError);
      return;
    }

    console.log(`📋 Conversations "Contact Polaris IA" trouvées: ${polarisConversations?.length || 0}`);
    if (polarisConversations?.length > 0) {
      polarisConversations.forEach((conv, index) => {
        console.log(`\n${index + 1}. ID: ${conv.id}`);
        console.log(`   Nom: ${conv.guest_name}`);
        console.log(`   Téléphone: ${conv.guest_phone}`);
        console.log(`   Email: ${conv.guest_email}`);
        console.log(`   Dernier message: ${conv.last_message}`);
        console.log(`   Date création: ${conv.created_at}`);
        console.log(`   Date dernier message: ${conv.last_message_at}`);
      });
    }

    // 2. Rechercher toutes les conversations de +33617370484
    const { data: phoneConversations, error: phoneError } = await supabase
      .from('conversations')
      .select('*')
      .eq('guest_phone', '+33617370484')
      .order('created_at', { ascending: false });

    if (phoneError) {
      console.error('Erreur recherche par téléphone:', phoneError);
      return;
    }

    console.log(`\n📞 Conversations de +33617370484 trouvées: ${phoneConversations?.length || 0}`);
    if (phoneConversations?.length > 0) {
      phoneConversations.forEach((conv, index) => {
        console.log(`\n${index + 1}. ID: ${conv.id}`);
        console.log(`   Nom: ${conv.guest_name}`);
        console.log(`   Email: ${conv.guest_email}`);
        console.log(`   Dernier message: ${conv.last_message}`);
        console.log(`   Date création: ${conv.created_at}`);
        console.log(`   Date dernier message: ${conv.last_message_at}`);
      });
    }

    // 3. Vérifier toutes les conversations récentes (dernières 24h)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: recentConversations, error: recentError } = await supabase
      .from('conversations')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });

    if (recentError) {
      console.error('Erreur recherche conversations récentes:', recentError);
      return;
    }

    console.log(`\n⏰ Conversations créées dans les dernières 24h: ${recentConversations?.length || 0}`);
    if (recentConversations?.length > 0) {
      recentConversations.forEach((conv, index) => {
        console.log(`\n${index + 1}. ID: ${conv.id}`);
        console.log(`   Nom: ${conv.guest_name}`);
        console.log(`   Téléphone: ${conv.guest_phone}`);
        console.log(`   Email: ${conv.guest_email}`);
        console.log(`   Date création: ${conv.created_at}`);
      });
    }

    // 4. Tester la récupération comme le fait l'interface
    console.log('\n🖥️ Test de récupération comme dans l\'interface...');
    const { data: uiConversations, error: uiError } = await supabase
      .from('conversations')
      .select(`
        id,
        guest_name,
        guest_phone,
        property,
        check_in_date,
        check_out_date,
        status,
        last_message,
        last_message_at,
        unread_count,
        host_id
      `)
      .order('last_message_at', { ascending: false });

    if (uiError) {
      console.error('Erreur récupération UI:', uiError);
      return;
    }

    console.log(`🖥️ Conversations pour l'interface: ${uiConversations?.length || 0}`);
    if (uiConversations?.length > 0) {
      console.log('\nPremières 5 conversations:');
      uiConversations.slice(0, 5).forEach((conv, index) => {
        console.log(`${index + 1}. ${conv.guest_name} - ${conv.last_message?.substring(0, 50) || 'Aucun message'}...`);
      });
    }

  } catch (error) {
    console.error('Erreur générale:', error);
  }
}

checkPolarisConversations();