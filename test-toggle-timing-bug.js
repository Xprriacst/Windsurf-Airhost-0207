const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://whxkhrtlccxubvjgexmi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquante');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const testHostId = 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7';

async function testToggleBug() {
  console.log('🔍 Test du bug de timing du toggle WhatsApp');
  
  try {
    // 1. Lire l'état actuel
    const { data: currentConfig } = await supabase
      .from('whatsapp_template_config')
      .select('auto_templates_enabled')
      .eq('host_id', testHostId)
      .single();
    
    console.log('📊 État actuel:', currentConfig);
    
    // 2. Simuler le changement de toggle (OFF → ON)
    const newValue = !currentConfig.auto_templates_enabled;
    console.log(`🔄 Simulation toggle: ${currentConfig.auto_templates_enabled} → ${newValue}`);
    
    // 3. Sauvegarder avec la nouvelle valeur
    const { error } = await supabase
      .from('whatsapp_template_config')
      .update({ 
        auto_templates_enabled: newValue,
        updated_at: new Date().toISOString()
      })
      .eq('host_id', testHostId);
    
    if (error) throw error;
    
    // 4. Vérifier la sauvegarde
    const { data: verifyConfig } = await supabase
      .from('whatsapp_template_config')
      .select('auto_templates_enabled')
      .eq('host_id', testHostId)
      .single();
    
    console.log('✅ Nouvel état:', verifyConfig);
    
    // 5. Test d'envoi de template
    console.log('\n🧪 Test d\'envoi de template...');
    const testPayload = {
      host_id: testHostId,
      guest_name: 'TestToggle',
      guest_phone: '+33666497372',
      property_id: '968070e6-e6ee-41d9-a3b0-c6365bff2097',
      check_in_date: '2025-01-20',
      check_out_date: '2025-01-22',
      send_welcome_template: true,
      welcome_template_name: 'hello_world'
    };
    
    const response = await fetch(`${supabaseUrl}/functions/v1/create-conversation-with-welcome`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    const result = await response.json();
    console.log('📤 Résultat Edge Function:', result);
    
    // Restaurer l'état initial
    await supabase
      .from('whatsapp_template_config')
      .update({ auto_templates_enabled: currentConfig.auto_templates_enabled })
      .eq('host_id', testHostId);
    
    console.log('🔄 État restauré');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testToggleBug();
