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
async function sendWelcomeTemplate(guestPhone, hostId, templateName) {
  try {
    console.log(`📱 Envoi du template WhatsApp "${templateName}" à ${guestPhone}`);
    
    // Vérifier la configuration WhatsApp de l'hôte
    const { data: hostConfig, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('host_id', hostId)
      .eq('is_active', true)
      .single();

    if (configError || !hostConfig) {
      console.log('⚠️ Configuration WhatsApp non trouvée ou inactive pour cet hôte');
      return { success: false, reason: 'Configuration WhatsApp manquante' };
    }

    if (!hostConfig.send_welcome_message) {
      console.log('📵 Envoi de message de bienvenue désactivé pour cet hôte');
      return { success: false, reason: 'Messages de bienvenue désactivés' };
    }

    // Appeler le service d'envoi de template
    const templateResponse = await fetch('http://localhost:8080/send-whatsapp-template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: guestPhone,
        template_name: templateName || hostConfig.welcome_template || 'hello_world',
        host_id: hostId
      })
    });

    if (templateResponse.ok) {
      const result = await templateResponse.json();
      console.log('✅ Template WhatsApp envoyé avec succès');
      return { success: true, messageId: result.messageId };
    } else {
      const error = await templateResponse.text();
      console.error('❌ Erreur envoi template:', error);
      return { success: false, reason: error };
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
      check_in_date,
      check_out_date,
      booking_reference,
      platform,
      send_welcome_message = true,
      welcome_template = null
    } = req.body;

    // Validation des champs obligatoires (host_id récupéré automatiquement)
    if (!guest_name || !guest_phone || !property_id) {
      return res.status(400).json({
        error: 'Champs obligatoires manquants',
        required: ['guest_name', 'guest_phone', 'property_id'],
        received: { guest_name, guest_phone, property_id }
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

    // Vérifier si la propriété existe (sans vérification host_id)
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', property_id)
      .single();

    if (propertyError || !property) {
      return res.status(404).json({
        error: 'Propriété non trouvée',
        property_id: property_id
      });
    }

    // Chercher une conversation existante
    const { data: existingConversation, error: searchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('guest_phone', normalizedPhone)
      .eq('property_id', property_id)
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
        property_id: property_id,
        guest_name: guest_name,
        guest_phone: normalizedPhone,
        guest_number: normalizedPhone,
        status: 'active',
        last_message: `Nouvelle réservation créée pour ${guest_name}`,
        last_message_at: new Date().toISOString(),
        unread_count: 0
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
        welcome_template
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

  // Rediriger vers l'endpoint principal
  req.body = testData;
  return app._router.handle(
    { ...req, method: 'POST', url: '/create-conversation' },
    res
  );
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