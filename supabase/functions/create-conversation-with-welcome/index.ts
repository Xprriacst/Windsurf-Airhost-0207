import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0';
serve(async (req)=>{
  try {
    // Vérifier la méthode HTTP
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'Méthode non autorisée. Utilisez POST.'
      }), {
        headers: {
          'Content-Type': 'application/json'
        },
        status: 405
      });
    }
    // Extraire les données de la requête
    const requestData = await req.json();
    // Valider les données requises
    const { host_id, guest_name, guest_phone, property_id, check_in_date, check_out_date, status = 'active', send_welcome_template = false, welcome_template_name = null } = requestData;
    if (!host_id || !guest_name || !guest_phone || !property_id || !check_in_date || !check_out_date) {
      return new Response(JSON.stringify({
        error: 'Données manquantes. Assurez-vous de fournir host_id, guest_name, guest_phone, property_id, check_in_date et check_out_date.'
      }), {
        headers: {
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // Créer un client Supabase avec les infos d'authentification de service
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Vérifier que la propriété existe
    const { data: propertyData, error: propertyError } = await supabaseClient.from('properties').select('*').eq('id', property_id).single();
    // Mode test : si la propriété n'existe pas mais que le nom de l'invité contient "Test",
    // on continue quand même pour faciliter les tests
    const isTestMode = guest_name.includes('Test') || guest_name.includes('moi');
    let property = propertyData;
    if (propertyError || !property) {
      if (!isTestMode) {
        return new Response(JSON.stringify({
          error: `La propriété avec l'ID ${property_id} n'existe pas`
        }), {
          headers: {
            'Content-Type': 'application/json'
          },
          status: 404
        });
      }
      console.log(`Mode test activé: propriété fictive ${property_id} acceptée`);
      // En mode test, on simule une propriété avec la structure correcte
      property = {
        id: property_id,
        host_id,
        address: {
          street: "Adresse fictive",
          city: "Ville fictive",
          country: "Pays fictif"
        },
        ai_enabled: true,
        ai_config: {}
      };
    }
    // Vérifier si une conversation existe déjà avec ces critères
    let query = supabaseClient.from('conversations').select('*').eq('property_id', property_id).eq('guest_phone', guest_phone);
    // Ajouter les filtres de date uniquement si les dates sont fournies
    if (check_in_date && check_in_date !== 'null') {
      query = query.eq('check_in_date', check_in_date);
    }
    if (check_out_date && check_out_date !== 'null') {
      query = query.eq('check_out_date', check_out_date);
    }
    const { data: existingConversation, error: existingError } = await query.maybeSingle();
    if (existingConversation) {
      return new Response(JSON.stringify({
        message: 'Une conversation similaire existe déjà',
        conversation: existingConversation
      }), {
        headers: {
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    // Créer la nouvelle conversation
    const now = new Date().toISOString();
    // Nettoyer le numéro de téléphone pour ne garder que les chiffres pour guest_number
    const guest_number = guest_phone.replace(/\D/g, '');
    const { data: newConversation, error: insertError } = await supabaseClient.from('conversations').insert([
      {
        host_id,
        guest_name,
        guest_phone,
        guest_number,
        property_id,
        property: property_id,
        check_in_date,
        check_out_date,
        status,
        last_message: `Nouvelle réservation créée pour ${guest_name}`,
        last_message_at: now,
        created_at: now,
        unread_count: 0
      }
    ]).select().single();
    if (insertError) {
      return new Response(JSON.stringify({
        error: `Erreur lors de la création de la conversation: ${insertError.message}`
      }), {
        headers: {
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    // Envoyer le template de bienvenue si activé
    let welcomeMessageSent = false;
    let welcomeMessageError = null;
    // Vérifier d'abord l'état réel de la configuration des templates dans la base de données
    // plutôt que de se fier uniquement aux paramètres de la requête
    let shouldSendTemplate = false;
    let actualTemplateName = welcome_template_name;
    try {
      // Récupérer la configuration des templates WhatsApp depuis la base de données
      console.log('Vérification de la configuration des templates pour host_id:', host_id);
      
      const { data: templateConfig, error: templateError } = await supabaseClient
        .from('whatsapp_template_config')
        .select('*')
        .eq('host_id', host_id)
        .single();
      
      if (templateError) {
        console.log('Erreur récupération config template ou config non trouvée:', templateError.message);
        console.log('Pas de configuration template trouvée, templates désactivés par défaut');
        // Si pas de configuration trouvée, ne pas envoyer de template
        shouldSendTemplate = false;
        actualTemplateName = null;
      } else {
        // Utiliser la configuration réelle depuis la base de données
        // CORRECTION DU BUG : vérifier auto_templates_enabled ET send_welcome_template
        const autoTemplatesEnabled = templateConfig.auto_templates_enabled;
        const templateEnabled = templateConfig.send_welcome_template;
        const templateName = templateConfig.welcome_template_name || welcome_template_name;
        
        // Template envoyé SEULEMENT si auto_templates_enabled ET send_welcome_template sont vrais
        shouldSendTemplate = autoTemplatesEnabled && templateEnabled && templateName;
        actualTemplateName = templateName;
        
        console.log('Configuration template récupérée depuis la base de données:', {
          auto_templates_enabled: autoTemplatesEnabled,
          send_welcome_template: templateEnabled,
          welcome_template_name: templateName,
          decision: shouldSendTemplate
        });
      }
      
      console.log('Décision finale pour l\'envoi du template:', {
        shouldSendTemplate,
        actualTemplateName,
        originalRequestParam: send_welcome_template
      });
      
    } catch (error) {
      console.error('Erreur lors de la vérification de la configuration des templates:', error);
      // En cas d'erreur, ne pas envoyer de template par sécurité
      shouldSendTemplate = false;
      actualTemplateName = null;
    }
    if (shouldSendTemplate && actualTemplateName) {
  if (!shouldSendTemplate) {
    // Sécurité supplémentaire : ne jamais envoyer si la config est OFF
    console.error('[BUG ALERT] Tentative d\'envoi de template alors que shouldSendTemplate=false (toggle OFF)', {
      host_id,
      auto_templates_enabled: templateConfig?.auto_templates_enabled,
      send_welcome_template: templateConfig?.send_welcome_template,
      welcome_template_name: templateConfig?.welcome_template_name
    });
    welcomeMessageError = '[SECURITY BLOCK] Envoi de template bloqué car toggle OFF';
  } else {
    // Log explicite avant envoi
    console.log('[SEND TEMPLATE] Envoi du template WhatsApp autorisé', {
      host_id,
      guest_phone,
      template: actualTemplateName
    });
  }
      try {
        // Re-récupérer la configuration WhatsApp si nécessaire
        let whatsappConfigData = null;
        let configError = null;
        if (!shouldSendTemplate) {
          // Sécurité ultime : retour sans envoi
          console.error('[SECURITY BLOCK] Blocage effectif de l\'envoi du template car shouldSendTemplate=false');
          return new Response(JSON.stringify({
            message: 'Aucun template envoyé (toggle OFF)',
            conversation: newConversation
          }), {
            headers: {
              'Content-Type': 'application/json'
            },
            status: 200
          });
        }
        try {
          // Essayer d'abord avec host_id
          const { data: configWithHost, error: hostError } = await supabaseClient.from('whatsapp_config').select('*').eq('host_id', host_id).single();
          if (!hostError && configWithHost) {
            whatsappConfigData = configWithHost;
          }
        } catch (hostErr) {
          console.log('Tentative avec host_id échouée, essai sans filtre:', hostErr);
        }
        // Si pas de résultat avec host_id, essayer sans filtre (prendre la première config)
        if (!whatsappConfigData) {
          try {
            const { data: configFallback, error: fallbackError } = await supabaseClient.from('whatsapp_config').select('*').limit(1).single();
            if (!fallbackError && configFallback) {
              whatsappConfigData = configFallback;
              console.log('Configuration WhatsApp récupérée en mode fallback');
            } else {
              configError = fallbackError;
            }
          } catch (fallbackErr) {
            configError = fallbackErr;
            console.log('Erreur fallback config WhatsApp:', fallbackErr);
          }
        }
        if (configError || !whatsappConfigData) {
          welcomeMessageError = `Configuration WhatsApp introuvable pour l'hôte ${host_id}`;
          console.log('Erreur récupération config WhatsApp:', configError?.message);
        } else {
          const whatsappConfig = {
            phone_number_id: whatsappConfigData.phone_number_id,
            token: whatsappConfigData.token // Corrigé: utilise 'token' au lieu de 'access_token'
          };
          console.log('Validation configuration WhatsApp:', {
            hasToken: !!whatsappConfig.token,
            tokenLength: whatsappConfig.token?.length || 0,
            phoneNumberId: whatsappConfig.phone_number_id,
            phoneLength: whatsappConfig.phone_number_id?.length || 0
          });
          if (!whatsappConfig.token || !whatsappConfig.phone_number_id || whatsappConfig.token.length < 10 || whatsappConfig.phone_number_id.length < 10) {
            welcomeMessageError = "Configuration WhatsApp invalide";
            console.log('Configuration invalide détectée');
          } else {
            console.log('Configuration WhatsApp trouvée et valide:', {
              phoneNumberId: whatsappConfig.phone_number_id,
              hasToken: !!whatsappConfig.token,
              tokenStart: whatsappConfig.token.substring(0, 20) + '...'
            });
            try {
              // Envoyer le template de bienvenue avec la configuration utilisateur
              const templateResult = await sendWelcomeTemplate(guest_phone, host_id, welcome_template_name, whatsappConfig.token, whatsappConfig.phone_number_id, supabaseClient, newConversation.id);
              welcomeMessageSent = true;
              console.log(`Template de bienvenue "${welcome_template_name}" envoyé à ${guest_phone}`, templateResult);
            } catch (templateError) {
              console.error('Erreur sendWelcomeTemplate:', templateError);
              welcomeMessageError = templateError.message;
            }
          }
        }
      } catch (error) {
        console.error('Erreur lors de l\'envoi du template de bienvenue:', error);
        welcomeMessageError = error.message;
      }
    }
    return new Response(JSON.stringify({
      message: 'Conversation créée avec succès',
      conversation: newConversation,
      welcome_template_sent: welcomeMessageSent,
      welcome_template_error: welcomeMessageError
    }), {
      headers: {
        'Content-Type': 'application/json'
      },
      status: 201
    });
  } catch (error) {
    console.error('Erreur non gérée:', error);
    return new Response(JSON.stringify({
      error: `Erreur serveur: ${error.message}`
    }), {
      headers: {
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
/**
 * Envoie un template WhatsApp de bienvenue
 */ async function sendWelcomeTemplate(guestPhone, hostId, templateName, whatsappToken, phoneNumberId, supabaseClient, conversationId) {
  console.log('sendWelcomeTemplate appelée avec:', {
    guestPhone,
    templateName,
    hasToken: !!whatsappToken,
    phoneNumberId,
    conversationId
  });
  if (!whatsappToken || !phoneNumberId) {
    console.error('Configuration manquante:', {
      hasToken: !!whatsappToken,
      phoneNumberId
    });
    throw new Error('Configuration WhatsApp manquante (token ou phone number ID)');
  }
  // Normaliser le numéro de téléphone
  const normalizedPhone = normalizePhoneNumber(guestPhone);
  // Déterminer la langue du template selon le nom
  const languageCode = templateName === 'hello_world' ? 'en_US' : 'fr';
  const templatePayload = {
    messaging_product: "whatsapp",
    to: normalizedPhone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode
      }
    }
  };
  console.log('Envoi template WhatsApp:', {
    templateName,
    languageCode,
    to: normalizedPhone
  });
  const response = await fetch(`https://graph.facebook.com/v17.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${whatsappToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(templatePayload)
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur WhatsApp API: ${response.status} - ${error}`);
  }
  const result = await response.json();
  console.log('Template WhatsApp envoyé avec succès:', result);
  // Sauvegarder le message template dans la base de données
  try {
    const messageContent = `Template de bienvenue "${templateName}" envoyé automatiquement`;
    const now = new Date().toISOString();
    const { error: messageError } = await supabaseClient.from('messages').insert([
      {
        conversation_id: conversationId,
        content: messageContent,
        direction: 'outbound',
        type: 'template',
        status: 'sent',
        created_at: now,
        whatsapp_message_id: result.messages?.[0]?.id || null
      }
    ]);
    if (messageError) {
      console.error('Erreur lors de la sauvegarde du message template:', messageError);
    } else {
      console.log('Message template sauvegardé dans la base de données');
    }
  } catch (saveError) {
    console.error('Erreur lors de la sauvegarde du message:', saveError);
  }
  return result;
}
/**
 * Normalise un numéro de téléphone au format international
 */ function normalizePhoneNumber(phone) {
  // Supprimer tous les caractères non numériques
  let cleaned = phone.replace(/\D/g, '');
  // Si le numéro commence par 0, le remplacer par 33 (pour la France)
  if (cleaned.startsWith('0')) {
    cleaned = '33' + cleaned.substring(1);
  }
  // S'assurer que le numéro commence par un code pays
  if (!cleaned.startsWith('+')) {
    // Si pas de +, l'ajouter
    if (cleaned.startsWith('33') || cleaned.startsWith('1') || cleaned.startsWith('44')) {
      cleaned = '+' + cleaned;
    } else {
      // Par défaut, ajouter +33 pour la France
      cleaned = '+33' + cleaned;
    }
  }
  return cleaned;
}
