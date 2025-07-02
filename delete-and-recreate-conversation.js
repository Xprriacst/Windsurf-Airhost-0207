/**
 * Script pour supprimer et recréer une conversation avec envoi automatique du template
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.DEV_SUPABASE_SERVICE_ROLE_KEY
);

async function deleteAndRecreateConversation() {
  const targetPhone = '+33617370484';
  
  try {
    console.log(`🗑️ Suppression de la conversation pour ${targetPhone}...`);
    
    // Supprimer la conversation existante
    const { data: deletedConversation, error: deleteError } = await supabase
      .from('conversations')
      .delete()
      .eq('guest_phone', targetPhone)
      .select();
    
    if (deleteError) {
      console.error('❌ Erreur lors de la suppression:', deleteError);
      return;
    }
    
    if (deletedConversation && deletedConversation.length > 0) {
      console.log('✅ Conversation supprimée:', deletedConversation[0].guest_name);
    } else {
      console.log('⚠️ Aucune conversation trouvée pour ce numéro');
    }
    
    console.log(`🔄 Création d'une nouvelle conversation pour ${targetPhone}...`);
    
    // Créer une nouvelle conversation via l'API
    const response = await fetch('http://localhost:3002/create-conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        guest_name: 'Test Template Automatique',
        guest_phone: targetPhone,
        property_id: 'a0624296-4e92-469c-9be2-dcbe8ff547c2', // Villa Côte d'Azur
        check_in_date: '2025-06-25',
        check_out_date: '2025-06-28',
        send_welcome_message: true,
        welcome_template: 'hello_world'
      }),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Nouvelle conversation créée avec succès');
      console.log('📋 Résultat:', result);
      
      if (result.template_sent) {
        console.log('📱 Template hello_world envoyé automatiquement');
      } else {
        console.log('⚠️ Template non envoyé:', result.template_error || 'Configuration WhatsApp manquante');
      }
    } else {
      console.error('❌ Erreur lors de la création:', result);
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

// Exécuter le script
deleteAndRecreateConversation();