/**
 * Test HTTP direct de l'Edge Function create-conversation-with-welcome
 */

import fetch from 'node-fetch';

async function testEdgeFunctionHTTP() {
  console.log('🧪 Test HTTP direct de l\'Edge Function');
  console.log('=========================================');

  const url = 'https://pnbfsiicxhckptlgtjoj.supabase.co/functions/v1/create-conversation-with-welcome';
  const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuYmZzaWljeGhja3B0bGd0am9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTU0MDk0OSwiZXhwIjoyMDY1MTE2OTQ5fQ.0Ie3N_BwEMb9a5FY9vq2ot4jgJQlUJA7I3IUQL97a4g';

  const payload = {
    host_id: 'a2ce1797-a5ab-4c37-9512-4a4058e0f1c7',
    guest_name: 'Test HTTP Direct',
    guest_phone: '+33655443322',
    property_id: '968070e6-e6ee-41d9-a3b0-c6365bff2097',
    check_in_date: '2025-08-15',
    check_out_date: '2025-08-18',
    send_welcome_template: true,
    welcome_template_name: 'welcome_checkin'
  };

  try {
    console.log('Envoi des données:', payload);
    console.log('URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey
      },
      body: JSON.stringify(payload)
    });

    console.log('\nRéponse HTTP:');
    console.log('Status:', response.status, response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Body:', responseText);

    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('\nDonnées parsées:', JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('Impossible de parser la réponse JSON');
      }
    }

  } catch (error) {
    console.error('Erreur lors de la requête:', error);
  }
}

testEdgeFunctionHTTP();