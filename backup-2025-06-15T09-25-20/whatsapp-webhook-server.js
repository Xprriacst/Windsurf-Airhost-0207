#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();

// Configuration CORS
app.use(cors());
app.use(express.json());

// Variables d'environnement
const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'airhost_webhook_verify_2024';

// Configuration Supabase - Production
const supabaseUrl = process.env.PROD_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Fonction pour normaliser un numéro de téléphone
function normalizePhoneNumber(phone) {
  return phone.replace(/[^\d]/g, '');
}

// Fonction pour trouver ou créer une conversation
async function findOrCreateConversation(guestPhone, phoneNumberId, guestName = null) {
  try {
    // Logique spéciale pour +33617370484 -> contact.polaris.ia@gmail.com
    if (guestPhone === '+33617370484' || guestPhone === '33617370484') {
      // Chercher une conversation spécifique pour contact.polaris.ia@gmail.com
      const { data: polarisConversation, error: polarisError } = await supabase
        .from('conversations')
        .select('*')
        .eq('guest_phone', '+33617370484')
        .eq('guest_name', 'Contact Polaris IA')
        .single();

      if (polarisConversation && !polarisError) {
        console.log('Conversation Contact Polaris IA trouvée:', polarisConversation.id);
        return polarisConversation;
      }

      // Si pas trouvée, créer une nouvelle conversation pour contact.polaris.ia@gmail.com
      console.log('Création conversation pour contact.polaris.ia@gmail.com');
    } else {
      // Chercher une conversation existante pour les autres numéros
      const { data: existingConversation, error: searchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('guest_phone', guestPhone)
        .single();

      if (existingConversation && !searchError) {
        return existingConversation;
      }
    }

    // Obtenir la première propriété disponible pour ce webhook
    const { data: defaultProperty } = await supabase
      .from('properties')
      .select('id, host_id')
      .limit(1)
      .single();

    if (!defaultProperty) {
      console.error('Aucune propriété trouvée dans la base de données');
      throw new Error('Aucune propriété disponible');
    }

    // Créer une nouvelle conversation avec nom spécifique pour +33617370484
    const conversationName = (guestPhone === '+33617370484' || guestPhone === '33617370484') 
      ? 'Contact Polaris IA' 
      : (guestName || `WhatsApp ${guestPhone.slice(-4)}`);

    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        guest_phone: guestPhone,
        guest_name: conversationName,
        property: defaultProperty.id,
        host_id: defaultProperty.host_id,
        status: 'active'
      })
      .select()
      .single();

    if (createError) {
      console.error('Erreur lors de la création de la conversation:', createError);
      throw createError;
    }

    console.log('Nouvelle conversation créée:', newConversation.id);
    return newConversation;
  } catch (error) {
    console.error('Erreur dans findOrCreateConversation:', error);
    throw error;
  }
}

// Fonction pour déclencher l'analyse GPT-4o
async function analyzeMessage(content) {
  try {
    // Utiliser directement l'API OpenAI
    const { OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY
    });

    console.log('[WhatsApp] Analyse du message avec GPT-4o');

    const systemPrompt = `Tu es un système d'analyse de conversations pour des communications Airbnb. Analyse le message suivant et identifie le type de situation nécessitant une attention particulière.

TYPES DE TAGS DE CONVERSATION :
- "Client mécontent" : Client exprimant une insatisfaction, plainte ou frustration
- "IA incertaine" : Question complexe où l'IA n'est pas sûre de sa réponse
- "Intervention hôte requise" : Check-in/check-out, problèmes techniques spécifiques, demandes personnalisées
- "Urgence critique" : Problème de sécurité, panne grave, situation d'urgence réelle
- "Escalade comportementale" : Ton agressif, menaces, comportement inapproprié
- "Réponse connue" : Question standard dont l'IA connaît la réponse

Réponds uniquement par un objet JSON avec cette structure exacte :
{
  "needsAttention": boolean,
  "conversationTag": "Client mécontent" | "IA incertaine" | "Intervention hôte requise" | "Urgence critique" | "Escalade comportementale" | "Réponse connue" | null,
  "confidence": number (0-1),
  "explanation": "explication en français détaillant pourquoi ce tag a été choisi",
  "recommendedAction": "suggestion d'action pour l'hôte"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content }
      ],
      max_tokens: 200,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    console.log(`[WhatsApp] Analyse terminée: ${result.conversationTag || 'non catégorisé'}`);
    
    return result;
  } catch (error) {
    console.error('Erreur lors de l\'analyse GPT-4o:', error);
    
    // Fallback avec analyse par mots-clés
    const analysis = _analyzeWithKeywords(content);
    console.log('[WhatsApp] Utilisation du fallback');
    return analysis;
  }
}

// Analyse de fallback par mots-clés
function _analyzeWithKeywords(content) {
  const lowerContent = content.toLowerCase();
  
  // Termes d'urgence critique
  const urgentTerms = [
    'urgence', 'urgent', 'emergency', 'help', 'aide', 'secours',
    'danger', 'accident', 'blessé', 'injured', 'cassé', 'broken',
    'feu', 'fire', 'fumée', 'smoke', 'inondation', 'flood',
    'cambriolage', 'vol', 'theft', 'police'
  ];
  
  // Termes d'escalade comportementale
  const aggressiveTerms = [
    'inacceptable', 'scandaleux', 'honte', 'arnaque', 'scam',
    'plainte', 'complaint', 'avocat', 'lawyer', 'tribunal',
    'procès', 'remboursement', 'refund', 'annulation'
  ];
  
  // Termes de client mécontent
  const dissatisfiedTerms = [
    'déçu', 'disappointed', 'pas content', 'mécontent',
    'problème', 'problem', 'issue', 'souci', 'dysfonctionnement'
  ];
  
  // Termes positifs (restaurants, informations)
  const positiveTerms = [
    'restaurant', 'resto', 'manger', 'eat', 'food', 'cuisine',
    'visiter', 'visit', 'voir', 'see', 'faire', 'do', 'aller', 'go',
    'recommandation', 'recommendation', 'conseil', 'advice',
    'merci', 'thank', 'parfait', 'perfect', 'super', 'great'
  ];
  
  if (urgentTerms.some(term => lowerContent.includes(term))) {
    return {
      needsAttention: true,
      conversationTag: 'Urgence critique',
      confidence: 0.8,
      explanation: 'Mots-clés d\'urgence détectés',
      recommendedAction: 'Intervention immédiate requise'
    };
  }
  
  if (aggressiveTerms.some(term => lowerContent.includes(term))) {
    return {
      needsAttention: true,
      conversationTag: 'Escalade comportementale',
      confidence: 0.7,
      explanation: 'Ton agressif détecté',
      recommendedAction: 'Gestion délicate requise'
    };
  }
  
  if (dissatisfiedTerms.some(term => lowerContent.includes(term))) {
    return {
      needsAttention: true,
      conversationTag: 'Client mécontent',
      confidence: 0.6,
      explanation: 'Insatisfaction détectée',
      recommendedAction: 'Traiter la plainte rapidement'
    };
  }
  
  if (positiveTerms.some(term => lowerContent.includes(term))) {
    return {
      needsAttention: false,
      conversationTag: 'Réponse connue',
      confidence: 0.7,
      explanation: 'Question standard ou positive',
      recommendedAction: 'Réponse automatique possible'
    };
  }
  
  return {
    needsAttention: true,
    conversationTag: 'IA incertaine',
    confidence: 0.5,
    explanation: 'Message non catégorisé',
    recommendedAction: 'Révision manuelle recommandée'
  };
}

// Endpoint GET pour la vérification du webhook
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log(`Vérification webhook WhatsApp: mode=${mode}, token=${token ? 'présent' : 'absent'}`);

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook WhatsApp vérifié avec succès');
    res.status(200).send(challenge);
  } else {
    console.error('Échec de la vérification du webhook WhatsApp - token incorrect');
    res.status(403).send('Forbidden');
  }
});

// Endpoint POST pour recevoir les messages
app.post('/webhook/whatsapp', async (req, res) => {
  try {
    const body = req.body;
    const timestamp = new Date().toISOString();
    
    console.log(`[${timestamp}] Webhook WhatsApp reçu:`, JSON.stringify(body, null, 2));

    // Gérer le format de test de Meta (direct value object)
    let value;
    if (body.field === 'messages' && body.value) {
      value = body.value;
      console.log('Format de test Meta détecté');
    } else if (body.object === 'whatsapp_business_account') {
      // Format standard webhook Meta
      console.log('Format webhook Meta officiel détecté');
      const entry = body.entry?.[0];
      if (!entry) {
        console.log('Erreur: Pas d\'entry dans le body');
        return res.status(400).json({ error: 'No entry found' });
      }
      const changes = entry?.changes?.[0];
      if (!changes) {
        console.log('Erreur: Pas de changes dans entry');
        return res.status(400).json({ error: 'No changes found' });
      }
      value = changes?.value;
      console.log('Value extraite:', JSON.stringify(value, null, 2));
    } else {
      console.log('Format webhook non reconnu, body:', JSON.stringify(body, null, 2));
      return res.status(400).json({ error: 'Invalid webhook event' });
    }

    if (!value || !value.messages || value.messages.length === 0) {
      console.log('Pas de messages dans le webhook');
      return res.status(200).json({ message: 'No messages to process' });
    }

    // Traiter chaque message
    for (const message of value.messages) {
      const messageContent = message.text?.body || '[Message non textuel]';
      const guestPhone = normalizePhoneNumber(message.from);
      const phoneNumberId = value.metadata.phone_number_id;
      
      // Récupérer le nom du contact
      const contact = value.contacts?.find(c => c.wa_id === message.from);
      const guestName = contact?.profile?.name;
      
      console.log(`Message reçu de ${message.from}: ${messageContent}`);
      
      try {
        // Trouver ou créer la conversation
        const conversation = await findOrCreateConversation(guestPhone, phoneNumberId, guestName);
        
        // Analyser le message avec GPT-4o
        const analysis = await analyzeMessage(messageContent);
        
        // Ajouter le message à la base de données
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            content: messageContent,
            direction: 'inbound',
            status: 'received',
            whatsapp_message_id: message.id,
            type: 'text'
          });

        if (messageError) {
          console.error('Erreur lors de l\'ajout du message:', messageError);
        } else {
          console.log(`Message enregistré avec analyse: ${analysis.conversationTag} (${analysis.confidence})`);
        }

        // Enregistrer l'analyse directement dans les colonnes de la conversation
        if (analysis && analysis.conversationTag && analysis.conversationTag !== 'non catégorisé') {
          try {
            console.log('[WhatsApp] Enregistrement analyse directement dans conversation');
            
            // Mapper les tags vers des priorités
            const priorityMapping = {
              'Urgence critique': 5,
              'Escalade comportementale': 4, 
              'Client mécontent': 3,
              'Intervention hôte requise': 3,
              'IA incertaine': 2,
              'Réponse connue': 1
            };
            
            const priorityLevel = priorityMapping[analysis.conversationTag] || 2;
            
            // Essayer de mettre à jour avec les nouvelles colonnes
            const { error: analysisError } = await supabase
              .from('conversations')
              .update({
                emergency_status: analysis.conversationTag === 'Urgence critique' ? 'critical' : 
                                 analysis.conversationTag === 'Escalade comportementale' ? 'escalation' :
                                 analysis.conversationTag === 'Client mécontent' ? 'dissatisfied' : 'normal',
                priority_level: priorityLevel,
                ai_analysis_type: 'gpt4o',
                needs_attention: analysis.needsAttention || false,
                analysis_confidence: analysis.confidence || 0.5,
                analysis_timestamp: new Date().toISOString(),
                whatsapp_message_id: message.id
              })
              .eq('id', conversation.id);

            if (analysisError) {
              console.log('Colonnes d\'urgence pas encore créées:', analysisError.message);
              console.log('Migration SQL nécessaire pour activer le système complet');
            } else {
              console.log(`✅ Analyse enregistrée: ${analysis.conversationTag} (priorité ${priorityLevel})`);
            }
          } catch (analysisError) {
            console.log('Système d\'urgence en attente de migration SQL');
          }
        }

        // Mettre à jour la conversation avec le dernier message
        const { error: updateError } = await supabase
          .from('conversations')
          .update({ 
            last_message_at: new Date().toISOString(),
            last_message: messageContent
          })
          .eq('id', conversation.id);

        if (updateError) {
          console.error('Erreur lors de la mise à jour de la conversation:', updateError);
        } else {
          console.log(`Conversation mise à jour avec le message: "${messageContent.substring(0, 50)}..."`);
        }


        
      } catch (error) {
        console.error('Erreur lors du traitement du message:', error);
      }
    }

    res.status(200).json({ message: 'OK' });
  } catch (error) {
    console.error('Erreur lors du traitement du webhook:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: error.message, 
      timestamp: new Date().toISOString() 
    });
  }
});

// Démarrage du serveur
const PORT = process.env.WEBHOOK_PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur webhook WhatsApp démarré sur le port ${PORT}`);
  console.log(`URL de vérification: http://localhost:${PORT}/webhook/whatsapp`);
});