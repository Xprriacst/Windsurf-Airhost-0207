// Script de test automatisé pour la Edge Function create-conversation-with-welcome
// Vérifie que le template est envoyé ou non selon la config
// Pour Node.js 18+ : fetch est global. Sinon, décommenter la ligne suivante :
// import fetch from 'node-fetch';

const EDGE_FUNCTION_URL = process.env.EDGE_FUNCTION_URL;
const HOST_ID = process.env.HOST_ID;
const PROPERTY_ID = process.env.PROPERTY_ID;

async function testCase(autoTemplatesEnabled, sendWelcomeTemplate, testLabel) {
  // L'administrateur doit manuellement mettre à jour la table whatsapp_template_config pour ce host_id avant chaque test
  console.log(`\n=== TEST: ${testLabel} ===`);
  console.log(`Pré-requis: auto_templates_enabled=${autoTemplatesEnabled}, send_welcome_template=${sendWelcomeTemplate}`);

  const payload = {
    host_id: HOST_ID,
    guest_name: 'Test AutoTemplate',
    guest_phone: '+33699999999',
    property_id: PROPERTY_ID,
    check_in_date: '2025-07-07',
    check_out_date: '2025-07-09',
    send_welcome_template: sendWelcomeTemplate,
    welcome_template_name: 'hello_world'
  };

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  console.log('Réponse:', data);
}

(async () => {
  // L'utilisateur doit s'assurer que la config en base est correcte avant chaque appel
  await testCase(true, true, 'TEMPLATE DOIT ÊTRE ENVOYÉ (toggle ON)');
  await testCase(false, true, 'TEMPLATE NE DOIT PAS ÊTRE ENVOYÉ (toggle OFF)');
})();
