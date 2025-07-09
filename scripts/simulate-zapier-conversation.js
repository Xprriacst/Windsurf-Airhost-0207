// Simule un appel Zapier à la Edge Function avec tous les paramètres utiles
// Usage: node scripts/simulate-zapier-conversation.js <toggle> <phone> <check_in> <check_out>

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const EDGE_FUNCTION_URL = 'https://whxkhrtlccxubvjgexmi.supabase.co/functions/v1/create-conversation-with-welcome';
const HOST_ID = 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7';
const PROPERTY_ID = '968070e6-e6ee-41d9-a3b0-c6365bff2097';

const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!PHONE_NUMBER_ID || !WHATSAPP_TOKEN || !ANON_KEY) {
  throw new Error('Variables d\'environnement manquantes : PHONE_NUMBER_ID, WHATSAPP_TOKEN, SUPABASE_ANON_KEY');
}


async function simulate(toggleOn, phone, checkIn, checkOut) {
  const payload = {
    host_id: HOST_ID,
    guest_name: 'Test Zapier',
    guest_phone: phone,
    property_id: PROPERTY_ID,
    check_in_date: checkIn,
    check_out_date: checkOut,
    send_welcome_template: true,
    welcome_template_name: 'hello_world',
    whatsapp_token: WHATSAPP_TOKEN,
    phone_number_id: PHONE_NUMBER_ID
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ANON_KEY}`
  };

  console.log(`\n=== Simulation toggle ${toggleOn ? 'ON' : 'OFF'} pour ${phone} ===`);
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  console.log('Réponse:', data);
}

// Simule toggle ON
simulate(true, '+33784585116', '2025-07-07', '2025-07-09');
// Simule toggle OFF
simulate(false, '+33617370484', '2025-07-07', '2025-07-09');
