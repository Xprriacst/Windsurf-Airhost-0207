const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  console.log('WhatsApp Webhook invoked with event:', JSON.stringify(event));
  
  // Initialiser Supabase
  console.log('Initializing Supabase with:', {
    url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    hasAnonKey: !!process.env.VITE_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });
  
  // Priorité des clés : SERVICE_ROLE_KEY > SERVICE_KEY > ANON_KEY
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials not found');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Supabase credentials not configured' })
    };
  }
  
  console.log('Using Supabase URL:', supabaseUrl);
  console.log('Using service role key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Vérification du webhook (GET)
  if (event.httpMethod === 'GET') {
    const mode = event.queryStringParameters['hub.mode'];
    const token = event.queryStringParameters['hub.verify_token'];
    const challenge = event.queryStringParameters['hub.challenge'];

    console.log('Webhook verification request:', { mode, token });
    
    // Vérifier que le mode est 'subscribe'
    if (mode !== 'subscribe') {
      console.log('Webhook verification failed: mode is not subscribe');
      return {
        statusCode: 403,
        body: 'Forbidden: Invalid mode'
      };
    }
    
    // Vérifier que le token correspond
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (!verifyToken) {
      console.error('WHATSAPP_VERIFY_TOKEN is not configured in environment variables');
      return {
        statusCode: 500,
        body: 'Server configuration error'
      };
    }
    
    if (token !== verifyToken) {
      console.log('Webhook verification failed: token does not match');
      return {
        statusCode: 403,
        body: 'Forbidden: Invalid verification token'
      };
    }
    
    console.log('Webhook verification successful');
    return {
      statusCode: 200,
      body: challenge
    };
  }

  // Traitement des messages (POST)
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body);
      console.log('Webhook message received:', JSON.stringify(body));

      // Vérifier si c'est un message WhatsApp
      if (body.object !== 'whatsapp_business_account') {
        return {
          statusCode: 400,
          body: 'Invalid webhook event'
        };
      }

      // Extraire les informations du message
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value || !value.messages || value.messages.length === 0) {
        console.log('No messages in webhook payload');
        return {
          statusCode: 200,
          body: 'No messages to process'
        };
      }

      // Traiter chaque message
      for (const message of value.messages) {
        await processMessage(supabase, value.metadata.phone_number_id, message, value.contacts);
      }

      return {
        statusCode: 200,
        body: 'OK'
      };
    } catch (error) {
      console.error('Error processing webhook:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      };
    }
  }

  return {
    statusCode: 405,
    body: 'Method Not Allowed'
  };
};

// Fonction pour normaliser un numéro de téléphone
function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return '';
  
  // S'assurer que le numéro commence par +
  let normalized = phoneNumber;
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  
  // Supprimer tout ce qui n'est pas un chiffre ou +
  normalized = normalized.replace(/[^+0-9]/g, '');
  
  return normalized;
}

async function processMessage(supabase, phoneNumberId, message, contacts) {
  try {
    console.log('Processing message:', JSON.stringify(message));
    
    // Extraire et normaliser le numéro de téléphone de l'expéditeur
    let from = message.from; // Numéro de téléphone de l'expéditeur
    
    // Normalisation du numéro de téléphone pour éviter les duplications
    from = normalizePhoneNumber(from);
    console.log('Numéro normalisé:', from);
    const messageId = message.id;
    const timestamp = message.timestamp;
    const messageType = message.type;
    
    // Extraire le contenu du message en fonction de son type
    let messageContent = '';
    let messageDetails = {};
    
    switch (messageType) {
      case 'text':
        messageContent = message.text?.body || '';
        break;
      case 'image':
        messageContent = '[Image]';
        messageDetails = {
          media_id: message.image?.id,
          mime_type: message.image?.mime_type,
          sha256: message.image?.sha256
        };
        break;
      case 'audio':
        messageContent = '[Audio]';
        messageDetails = {
          media_id: message.audio?.id
        };
        break;
      case 'video':
        messageContent = '[Vidéo]';
        messageDetails = {
          media_id: message.video?.id
        };
        break;
      case 'document':
        messageContent = '[Document]';
        messageDetails = {
          media_id: message.document?.id,
          filename: message.document?.filename
        };
        break;
      case 'location':
        messageContent = '[Localisation]';
        messageDetails = {
          latitude: message.location?.latitude,
          longitude: message.location?.longitude
        };
        break;
      default:
        messageContent = `[Message de type ${messageType}]`;
    }
    
    console.log(`Type de message reçu: ${messageType}, contenu: ${messageContent}`);
    
    // Si le message est vide et que ce n'est pas un type spécial, utiliser un texte par défaut
    if (!messageContent && !['image', 'audio', 'video', 'document', 'location'].includes(messageType)) {
      messageContent = '[Message sans contenu]';
    }
    
    // Récupérer le nom du contact s'il est disponible
    const contactName = contacts?.[0]?.profile?.name || 'Invité';

    // Trouver la conversation correspondante (recherche élargie)
    console.log('Recherche de conversation pour le numéro:', from);
    // Utiliser une approche plus robuste pour la requête OR
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, guest_phone, guest_number, unread_count')
      .or('guest_phone.eq.' + from + ',guest_number.eq.' + from);
    
    console.log('Recherche de conversations avec les critères:', {
      guest_phone: from,
      guest_number: from,
      query: 'guest_phone.eq.' + from + ',guest_number.eq.' + from,
      resultCount: conversations?.length || 0
    });

    if (convError) {
      console.error('Error finding conversation:', convError);
      throw convError;
    }

    let conversationId;
    
    if (!conversations || conversations.length === 0) {
      console.log('No conversation found for phone:', from);
      console.log('Creating new conversation for phone:', from);
      
      // Récupérer une propriété par défaut pour associer la conversation
      console.log('Trying to fetch properties from database...');
      let propertyId;
      
      try {
        const { data: properties, error: propError } = await supabase
          .from('properties')
          .select('id, name')
          .limit(1);
          
        console.log('Properties query result:', { properties, error: propError });
        
        if (propError) {
          console.error('Error finding property:', propError);
          // Utiliser l'ID de propriété connu comme fallback
          propertyId = 'f0e8bb59-214e-4dc7-a80f-406f89220cff';
          console.log('Using hardcoded property ID as fallback:', propertyId);
        } else if (!properties || properties.length === 0) {
          console.error('No property found to associate with conversation');
          // Utiliser l'ID de propriété connu comme fallback
          propertyId = 'f0e8bb59-214e-4dc7-a80f-406f89220cff';
          console.log('Using hardcoded property ID as fallback:', propertyId);
        } else {
          propertyId = properties[0].id;
          console.log('Found property from database:', properties[0].name, 'with ID:', propertyId);
        }
      } catch (error) {
        console.error('Exception while fetching properties:', error);
        // Utiliser l'ID de propriété connu comme fallback
        propertyId = 'f0e8bb59-214e-4dc7-a80f-406f89220cff';
        console.log('Using hardcoded property ID as fallback:', propertyId);
      }
      
      // Créer une nouvelle conversation
      const timestamp = new Date().toISOString();
      console.log(`[WEBHOOK ${timestamp}] Création d'une nouvelle conversation pour le numéro:`, from);
      
      // Tenter une autre recherche pour s'assurer qu'il n'y a pas de conversation existante
      // Parfois la recherche précédente peut échouer à cause de caractères spéciaux
      const { data: lastCheck, error: lastCheckError } = await supabase
        .from('conversations')
        .select('id')
        .filter('guest_number', 'eq', from)
        .limit(1);
      
      if (!lastCheckError && lastCheck && lastCheck.length > 0) {
        console.log(`Conversation trouvée lors de la double vérification:`, lastCheck[0]);
        conversationId = lastCheck[0].id;
        
        // Mise à jour de la conversation existante puisqu'on ne va pas créer de nouvelle conversation
        const existingTimestamp = new Date().toISOString();
        const { data: existingConv, error: existingError } = await supabase
          .from('conversations')
          .select('unread_count')
          .eq('id', conversationId)
          .single();
        
        if (!existingError) {
          // Mettre à jour le compteur de messages non lus et le dernier message
          const updateData = {
            unread_count: (existingConv.unread_count || 0) + 1,
            last_message: messageContent,
            last_message_at: existingTimestamp
          };
          
          await supabase
            .from('conversations')
            .update(updateData)
            .eq('id', conversationId);
            
          console.log(`Conversation existante mise à jour avec les nouvelles données:`, updateData);
        }
        
        // Important: On ne fait pas de return pour continuer et enregistrer le message
      }
      
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          property_id: propertyId,
          guest_phone: from,
          guest_number: from, // Ajouter guest_number avec la même valeur que guest_phone
          guest_name: contactName,
          unread_count: 1,
          last_message: messageContent,
          last_message_at: timestamp,
          status: 'active',
          created_at: timestamp
        })
        .select();
        
      if (createError) {
        console.error('Error creating conversation:', createError);
        throw createError;
      }
      
      console.log('New conversation created:', newConversation);
      conversationId = newConversation[0].id;
    } else {
      const conversation = conversations[0];
      console.log('Found conversation:', conversation);
      conversationId = conversation.id;

      // Si c'est une conversation existante, mettre à jour le compteur de messages non lus
      const timestamp = new Date().toISOString();
      const updateData = {
        unread_count: (conversation.unread_count || 0) + 1,
        last_message: messageContent,
        last_message_at: timestamp
      };
      
      console.log(`[WEBHOOK ${timestamp}] Mise à jour de la conversation ${conversationId} avec:`, updateData);
      
      // Force du délai pour s'assurer que la mise à jour est propagative
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const { data: updatedConversation, error: updateError } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', conversationId)
        .select();
        
      if (updateError) {
        console.error(`[WEBHOOK ${timestamp}] Error updating conversation:`, updateError);
        throw updateError;
      }
      
      console.log(`[WEBHOOK ${timestamp}] Conversation updated successfully:`, updatedConversation);
      
      // Forcer une deuxième mise à jour pour garantir que le changement est détecté par Realtime
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Petite mise à jour séparée pour déclencher un second événement Realtime
      const { data: refreshData, error: refreshError } = await supabase
        .from('conversations')
        .update({
          _refresh_trigger: Math.random().toString(36).substring(2, 15) // Valeur aléatoire
        })
        .eq('id', conversationId)
        .select();
        
      if (refreshError) {
        console.error(`[WEBHOOK ${timestamp}] Error refreshing conversation:`, refreshError);
        // Ne pas échouer pour cette erreur, c'est juste un refresh supplémentaire
      } else {
        console.log(`[WEBHOOK ${timestamp}] Conversation refresh triggered:`, refreshData);
      }
    }
    
    // Enregistrer le message dans la base de données
    const { data: messageData, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content: messageContent,
        direction: 'inbound',
        type: messageType === 'text' ? 'text' : messageType,
        status: 'received',
        metadata: {
          whatsapp_message_id: messageId,
          timestamp: timestamp,
          ...messageDetails  // Inclut les détails spécifiques au type de message
        }
      })
      .select();

    if (msgError) {
      console.error('Error inserting message:', msgError);
      throw msgError;
    }
    
    if (!messageData || messageData.length === 0) {
      console.error('Le message a été inséré mais aucune donnée n\'a été retournée');
    } else {
      console.log('Message inséré avec succès avec l\'ID:', messageData[0].id);
      
      // Déclencher explicitement une mise à jour pour Realtime
      await supabase
        .from('messages')
        .update({ _realtime_trigger: new Date().toISOString() })
        .eq('id', messageData[0].id);
        
      console.log('Signal Realtime envoyé pour le nouveau message');

      // Appeler la fonction analyze-emergency pour détecter les cas d'urgence
      try {
        console.log('Appel de la fonction analyze-emergency pour le message:', messageData[0].id);
        
        // Récupérer le host_id à partir de la conversation
        const { data: conversationData, error: conversationError } = await supabase
          .from('conversations')
          .select('property_id')
          .eq('id', conversationId)
          .single();

        if (conversationError) {
          console.error('Erreur lors de la récupération de la property_id:', conversationError);
        } else if (conversationData) {
          // Récupérer le host_id à partir de la propriété
          const { data: propertyData, error: propertyError } = await supabase
            .from('properties')
            .select('host_id')
            .eq('id', conversationData.property_id)
            .single();

          if (propertyError) {
            console.error('Erreur lors de la récupération du host_id:', propertyError);
          } else if (propertyData) {
            // Appeler la fonction d'analyse d'urgence via une requête HTTP
            const hostId = propertyData.host_id;
            const analyzeUrl = process.env.SITE_URL ? `${process.env.SITE_URL}/.netlify/functions/analyze-emergency` : 'http://localhost:8888/.netlify/functions/analyze-emergency';
            
            console.log('Appel de analyze-emergency avec URL:', analyzeUrl);
            console.log('Paramètres:', { conversationId, hostId });
            
            try {
              const fetch = require('node-fetch');
              const response = await fetch(analyzeUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId, hostId })
              });
              
              if (response.ok) {
                const result = await response.json();
                console.log('Résultat de l\'analyse d\'urgence:', result);
              } else {
                console.error('Échec de l\'appel à analyze-emergency:', await response.text());
              }
            } catch (analyzeError) {
              console.error('Erreur lors de l\'appel à analyze-emergency:', analyzeError);
            }
          }
        }
      } catch (error) {
        console.error('Erreur lors de l\'analyse d\'urgence:', error);
        // Ne pas faire échouer le traitement principal si l'analyse échoue
      }
    }

  } catch (error) {
    console.error('Error in processMessage:', error);
    throw error;
  }
}
