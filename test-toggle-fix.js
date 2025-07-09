import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeGtocnRsY2N4dWJ2amdleG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzk5NzQyMSwiZXhwIjoyMDYzNTczNDIxfQ.M-kejVvluMfnnb-pQdfA9y6MtiFvRRR5zbvfc-JDvV4';

const supabase = createClient(supabaseUrl, supabaseKey);
const HOST_ID = 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7';

async function testToggleFix() {
  console.log('🧪 TEST DE LA CORRECTION DU TOGGLE WHATSAPP');
  console.log('='.repeat(50));

  try {
    // 1. État initial
    console.log('\n1️⃣ Vérification état initial...');
    const { data: initialData, error: initialError } = await supabase
      .from('whatsapp_template_config')
      .select('auto_templates_enabled, send_welcome_template, welcome_template_name, updated_at')
      .eq('host_id', HOST_ID);

    if (initialError) {
      console.error('❌ Erreur lecture initiale:', initialError);
      return;
    }

    const initialConfig = initialData[0];
    console.log('📊 Configuration initiale:');
    console.log(`- auto_templates_enabled: ${initialConfig.auto_templates_enabled}`);
    console.log(`- send_welcome_template: ${initialConfig.send_welcome_template}`);
    console.log(`- welcome_template_name: ${initialConfig.welcome_template_name}`);
    console.log(`- updated_at: ${initialConfig.updated_at}`);

    // 2. Test changement toggle OFF → ON
    console.log('\n2️⃣ Test changement toggle OFF → ON...');
    const newToggleState = !initialConfig.auto_templates_enabled;
    
    const { error: updateError } = await supabase
      .from('whatsapp_template_config')
      .update({
        auto_templates_enabled: newToggleState,
        updated_at: new Date().toISOString()
      })
      .eq('host_id', HOST_ID);

    if (updateError) {
      console.error('❌ Erreur mise à jour:', updateError);
      return;
    }

    console.log(`✅ Toggle changé: ${initialConfig.auto_templates_enabled} → ${newToggleState}`);

    // 3. Vérification du changement
    console.log('\n3️⃣ Vérification du changement...');
    const { data: updatedData, error: verifyError } = await supabase
      .from('whatsapp_template_config')
      .select('auto_templates_enabled, updated_at')
      .eq('host_id', HOST_ID);

    if (verifyError) {
      console.error('❌ Erreur vérification:', verifyError);
      return;
    }

    const updatedConfig = updatedData[0];
    console.log('📊 Configuration après changement:');
    console.log(`- auto_templates_enabled: ${updatedConfig.auto_templates_enabled}`);
    console.log(`- updated_at: ${updatedConfig.updated_at}`);

    // 4. Validation
    if (updatedConfig.auto_templates_enabled === newToggleState) {
      console.log('\n✅ SUCCESS: Le toggle se synchronise correctement avec la base !');
    } else {
      console.log('\n❌ ÉCHEC: Le toggle ne se synchronise pas correctement');
    }

    // 5. Restaurer l'état initial
    console.log('\n4️⃣ Restauration état initial...');
    await supabase
      .from('whatsapp_template_config')
      .update({
        auto_templates_enabled: initialConfig.auto_templates_enabled,
        updated_at: initialConfig.updated_at
      })
      .eq('host_id', HOST_ID);

    console.log('🔄 État initial restauré');

    // 6. Instructions pour test manuel
    console.log('\n📋 INSTRUCTIONS POUR TEST MANUEL:');
    console.log('1. Ouvrir https://airhost-rec.netlify.app');
    console.log('2. Se connecter avec contact.polaris.ia@gmail.com');
    console.log('3. Cliquer sur "Configuration WhatsApp" dans la sidebar');
    console.log('4. Changer le toggle "Envoyer automatiquement..."');
    console.log('5. Vérifier dans la console les logs:');
    console.log('   - "🔄 Toggle changé: false → true"');
    console.log('   - "💾 Données template à sauvegarder:"');
    console.log('   - "✅ Configuration template sauvegardée avec succès"');
    console.log('   - "✅ Toggle sauvegardé automatiquement"');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

testToggleFix();
