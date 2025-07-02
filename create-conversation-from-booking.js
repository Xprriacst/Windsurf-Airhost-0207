#!/usr/bin/env node

/**
 * Fonction de création de conversation depuis une réservation
 * Adaptée pour notre architecture serveur Node.js + Supabase
 * 
 * À utiliser avec Zapier ou n'importe quel webhook de réservation
 */

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';

// Charger les variables d'environnement depuis .env
if (fs.existsSync('.env')) {
  dotenv.config();
}

// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://pnbfsiicxhckptlgtjoj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquant dans les variables d\'environnement');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuration Express
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

/**
 * Normalise un numéro de téléphone au format international
 */
function normalizePhoneNumber(phone) {
  if (!phone) return null;
  
  // Retirer tous les caractères non numériques
  let cleaned = phone.replace(/\D/g, '');
  
  // Si commence par 0, remplacer par 33 (France)
  if (cleaned.startsWith('0')) {
    cleaned = '33' + cleaned.substring(1);
  }
  
  // Si ne commence pas par +, l'ajouter
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

/**
 * Envoie un template WhatsApp de bienvenue si configuré
 */
async function sendWelcomeTemplate(guestPhone, hostId, templateName, conversationId = null) {
  try {
    console.log(`📱 Envoi du template WhatsApp "${templateName}" à ${guestPhone}`);
    
    // Récupérer la configuration WhatsApp complète depuis la base de données
    const { data: whatsappConfig, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (configError || !whatsappConfig) {
      console.log('⚠️ Configuration WhatsApp non trouvée:', configError);
      return { success: false, reason: 'Configuration WhatsApp manquante' };
    }

    if (!whatsappConfig.token || !whatsappConfig.phone_number_id) {
      console.log('⚠️ Configuration WhatsApp incomplète (token ou phone number ID manquant)');
      return { success: false, reason: 'Configuration WhatsApp incomplète' };
    }

    // Configuration simplifiée pour les templates (toujours activée si credentials présents)
    const templateConfig = {
      template_enabled: true,
      welcome_template: 'hello_world' // Template par défaut
    };

    console.log('Configuration WhatsApp trouvée:', { 
      phoneNumberId: whatsappConfig.phone_number_id, 
      hasToken: !!whatsappConfig.token,
      templateEnabled: templateConfig.template_enabled,
      welcomeTemplate: templateConfig.welcome_template
    });

    // Normaliser le numéro de téléphone
    const normalizedPhone = normalizePhoneNumber(guestPhone);
    // Utiliser directement "hello_world" qui est confirmé fonctionnel
    const finalTemplateName = templateName || 'hello_world';

    // Vérifier si un nom de template est défini
    if (!finalTemplateName) {
      console.log('⚠️ Aucun nom de template défini dans la configuration');
      return { success: false, reason: 'Nom de template manquant dans la configuration' };
    }

    // Préparer le payload du template
    const templatePayload = {
      messaging_product: "whatsapp",
      to: normalizedPhone,
      type: "template",
      template: {
        name: finalTemplateName,
        language: {
          code: "en_US"
        }
      }
    };

    // Envoyer directement via l'API WhatsApp
    const response = await fetch(`https://graph.facebook.com/v17.0/${whatsappConfig.phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappConfig.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(templatePayload)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Template WhatsApp envoyé avec succès');
      
      // Sauvegarder le message du template dans la base de données si on a l'ID de conversation
      if (conversationId) {
        try {
          const templateMessage = `Template de bienvenue "${finalTemplateName}" envoyé automatiquement`;
          const { error: messageError } = await supabase
            .from('messages')
            .insert([{
              conversation_id: conversationId,
              content: templateMessage,
              direction: 'outgoing',
              type: 'template',
              status: 'sent',
              metadata: {
                whatsapp_message_id: result.messages?.[0]?.id,
                template_name: finalTemplateName
              }
            }]);

          if (messageError) {
            console.log('⚠️ Erreur sauvegarde message template:', messageError);
          } else {
            console.log('💾 Message template sauvegardé dans la base');
          }
        } catch (dbError) {
          console.log('⚠️ Erreur base de données pour message template:', dbError);
        }
      }
      
      return { success: true, messageId: result.messages?.[0]?.id };
    } else {
      const error = await response.text();
      console.error('❌ Erreur WhatsApp API:', response.status, error);
      return { success: false, reason: `Erreur WhatsApp API: ${response.status} - ${error}` };
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi du template:', error);
    return { success: false, reason: error.message };
  }
}

/**
 * Endpoint principal pour créer une conversation depuis une réservation
 */
app.post('/create-conversation', async (req, res) => {
  try {
    console.log('🏨 Création de conversation depuis réservation...');
    console.log('📋 Données reçues:', req.body);

    // Extraction et validation des données
    const {
      host_id,
      guest_name,
      guest_phone,
      guest_email,
      property_id,
      property_name,
      host_email,
      check_in_date,
      check_out_date,
      booking_reference,
      platform,
      send_welcome_message = true,
      welcome_template = null
    } = req.body;

    // Validation des champs obligatoires
    if (!guest_name || !guest_phone) {
      return res.status(400).json({
        error: 'Champs obligatoires manquants',
        required: ['guest_name', 'guest_phone'],
        received: { guest_name, guest_phone }
      });
    }

    // Normaliser le numéro de téléphone
    const normalizedPhone = normalizePhoneNumber(guest_phone);
    if (!normalizedPhone) {
      return res.status(400).json({
        error: 'Numéro de téléphone invalide',
        provided: guest_phone
      });
    }

    console.log(`📞 Numéro normalisé: ${guest_phone} → ${normalizedPhone}`);

    // Récupérer les informations de propriété
    let property;
    let finalPropertyId = property_id;
    let finalHostId = host_id;

    // Si property_id n'est pas fourni, essayer de le trouver via property_name
    if (!property_id && property_name) {
      const { data: foundProperty, error: searchError } = await supabase
        .from('properties')
        .select('*')
        .ilike('name', `%${property_name}%`)
        .limit(1)
        .single();

      if (!searchError && foundProperty) {
        property = foundProperty;
        finalPropertyId = foundProperty.id;
        finalHostId = foundProperty.host_id;
        console.log(`🏠 Propriété trouvée par nom: ${property_name} → ${finalPropertyId}`);
      }
    }

    // Si on a property_id, récupérer les détails de la propriété
    if (finalPropertyId && !property) {
      const { data: foundProperty, error: propertyError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', finalPropertyId)
        .single();

      if (!propertyError && foundProperty) {
        property = foundProperty;
        finalHostId = foundProperty.host_id;
      }
    }

    // Si aucune propriété trouvée, utiliser la propriété par défaut
    if (!property) {
      console.log('⚠️ Aucune propriété spécifique trouvée, utilisation de la propriété par défaut');
      const { data: defaultProperty, error: defaultError } = await supabase
        .from('properties')
        .select('*')
        .eq('name', 'Villa Côte d\'Azur')
        .single();

      if (!defaultError && defaultProperty) {
        property = defaultProperty;
        finalPropertyId = defaultProperty.id;
        finalHostId = defaultProperty.host_id;
        console.log(`🏠 Propriété par défaut utilisée: ${finalPropertyId}`);
      } else {
        return res.status(404).json({
          error: 'Aucune propriété trouvée',
          message: 'Impossible de déterminer la propriété pour cette réservation',
          received: { property_id, property_name, host_email }
        });
      }
    }

    // Chercher une conversation existante
    const { data: existingConversation, error: searchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('guest_phone', normalizedPhone)
      .eq('property_id', finalPropertyId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (searchError) {
      console.error('❌ Erreur recherche conversation:', searchError);
      return res.status(500).json({
        error: 'Erreur lors de la recherche de conversation existante',
        details: searchError.message
      });
    }

    let conversation;
    let isNewConversation = false;

    if (existingConversation && existingConversation.length > 0) {
      // Conversation existante trouvée
      conversation = existingConversation[0];
      console.log(`♻️ Conversation existante trouvée: ${conversation.id}`);

      // Mettre à jour avec les nouvelles informations de réservation
      const { data: updatedConv, error: updateError } = await supabase
        .from('conversations')
        .update({
          guest_name: guest_name,
          last_message: `Réservation mise à jour pour ${guest_name}`,
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversation.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Erreur mise à jour conversation:', updateError);
        return res.status(500).json({
          error: 'Erreur lors de la mise à jour de la conversation',
          details: updateError.message
        });
      }

      conversation = updatedConv;
    } else {
      // Créer une nouvelle conversation
      console.log('🆕 Création d\'une nouvelle conversation');
      isNewConversation = true;

      const newConversationData = {
        host_id: finalHostId,
        property_id: finalPropertyId,
        guest_name: guest_name,
        guest_phone: normalizedPhone,
        guest_number: normalizedPhone,
        status: 'active',
        last_message: `Nouvelle réservation créée pour ${guest_name}`,
        last_message_at: new Date().toISOString(),
        unread_count: 0,
        property: finalPropertyId,
        check_in_date: check_in_date,
        check_out_date: check_out_date
      };

      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert(newConversationData)
        .select()
        .single();

      if (createError) {
        console.error('❌ Erreur création conversation:', createError);
        return res.status(500).json({
          error: 'Erreur lors de la création de la conversation',
          details: createError.message
        });
      }

      conversation = newConv;
    }

    // Envoyer le template de bienvenue si demandé et si c'est une nouvelle conversation
    let welcomeMessageResult = null;
    if (send_welcome_message && isNewConversation) {
      welcomeMessageResult = await sendWelcomeTemplate(
        normalizedPhone,
        host_id,
        welcome_template,
        conversation.id  // Passer l'ID de la conversation créée
      );
    }

    // Réponse de succès
    const response = {
      success: true,
      message: isNewConversation ? 'Conversation créée avec succès' : 'Conversation mise à jour',
      conversation: conversation,
      isNewConversation: isNewConversation,
      welcomeMessage: welcomeMessageResult
    };

    console.log('✅ Opération terminée avec succès');
    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur',
      details: error.message
    });
  }
});

/**
 * Endpoint de test pour vérifier que le service fonctionne
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Airhost - Création de conversations',
    timestamp: new Date().toISOString()
  });
});

/**
 * Endpoint pour tester la création de conversation
 */
app.post('/test-conversation', async (req, res) => {
  const testData = {
    host_id: req.body.host_id || 'test-host-id',
    guest_name: 'Invité Test Zapier',
    guest_phone: '+33612345678',
    guest_email: 'test@example.com',
    property_id: req.body.property_id || 'test-property-id',
    check_in_date: '2025-07-01',
    check_out_date: '2025-07-07',
    booking_reference: 'TEST-' + Date.now(),
    platform: 'Airbnb',
    send_welcome_message: true,
    welcome_template: 'hello_world'
  };

  console.log('🧪 Test de création de conversation avec:', testData);

  // Traiter directement la demande de test
  try {
    const {
      host_id,
      guest_name,
      guest_phone,
      property_id,
      check_in_date,
      check_out_date,
      send_welcome_message,
      welcome_template
    } = testData;

    // Normaliser le numéro de téléphone
    const normalizedPhone = normalizePhoneNumber(guest_phone);
    console.log(`📞 Numéro normalisé: ${guest_phone} → ${normalizedPhone}`);

    // Créer une nouvelle conversation
    const newConversationData = {
      host_id: host_id,
      property_id: property_id,
      guest_name: guest_name,
      guest_phone: normalizedPhone,
      guest_number: normalizedPhone,
      status: 'active',
      last_message: `Test conversation créée pour ${guest_name}`,
      last_message_at: new Date().toISOString(),
      unread_count: 0,
      property: property_id,
      check_in_date: check_in_date,
      check_out_date: check_out_date
    };

    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert(newConversationData)
      .select()
      .single();

    if (createError) {
      console.error('❌ Erreur création conversation test:', createError);
      return res.status(500).json({
        error: 'Erreur lors de la création de la conversation test',
        details: createError.message
      });
    }

    // Envoyer le template de bienvenue si demandé
    let welcomeMessageResult = null;
    if (send_welcome_message) {
      welcomeMessageResult = await sendWelcomeTemplate(
        normalizedPhone,
        host_id,
        welcome_template
      );
    }

    // Réponse de succès
    res.json({
      success: true,
      message: 'Conversation test créée avec succès',
      conversation: newConv,
      welcomeMessage: welcomeMessageResult
    });

  } catch (error) {
    console.error('❌ Erreur test conversation:', error);
    res.status(500).json({
      error: 'Erreur lors du test de conversation',
      details: error.message
    });
  }
});

// Démarrage du serveur
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Service de création de conversations démarré sur le port ${PORT}`);
  console.log(`📍 Endpoints disponibles:`);
  console.log(`   POST http://localhost:${PORT}/create-conversation`);
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(`   POST http://localhost:${PORT}/test-conversation`);
});

export default app;