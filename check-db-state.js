import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeGtocnRsY2N4dWJ2amdleG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzk5NzQyMSwiZXhwIjoyMDYzNTczNDIxfQ.M-kejVvluMfnnb-pQdfA9y6MtiFvRRR5zbvfc-JDvV4';

const supabase = createClient(supabaseUrl, supabaseKey);

const HOST_ID = 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7';

async function checkState() {
  console.log('🔍 Vérification état actuel de la base...');
  
  try {
    const { data, error } = await supabase
      .from('whatsapp_template_config')
      .select('*')
      .eq('host_id', HOST_ID);

    if (error) {
      console.error('❌ Erreur:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('❌ Aucune configuration trouvée pour cet hôte');
      return;
    }

    const config = data[0];
    console.log('📊 Configuration actuelle:');
    console.log(`- auto_templates_enabled: ${config.auto_templates_enabled}`);
    console.log(`- send_welcome_template: ${config.send_welcome_template}`);
    console.log(`- welcome_template_name: ${config.welcome_template_name}`);
    console.log(`- updated_at: ${config.updated_at}`);
    
    console.log('\n🎯 ANALYSE:');
    if (config.auto_templates_enabled === false) {
      console.log('✅ Le toggle est bien désactivé en base');
      console.log('→ Votre action de décocher a peut-être fonctionné');
    } else {
      console.log('❌ Le toggle est encore activé en base');
      console.log('→ La synchronisation UI → base ne fonctionne pas');
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

checkState();
