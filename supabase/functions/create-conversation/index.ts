import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { guest_name, guest_phone, property_id, check_in_date, check_out_date } = await req.json()

    // Normaliser le numéro de téléphone
    const normalizePhoneNumber = (phone: string): string => {
      let normalized = phone.replace(/[\s\-\(\)\.]/g, '');
      
      if (normalized.startsWith('0')) {
        normalized = '+33' + normalized.substring(1);
      } else if (normalized.startsWith('33') && !normalized.startsWith('+33')) {
        normalized = '+' + normalized;
      } else if (!normalized.startsWith('+')) {
        normalized = '+33' + normalized;
      }
      
      return normalized;
    };

    const normalizedPhone = normalizePhoneNumber(guest_phone);

    // Vérifier si la conversation existe déjà
    const { data: existingConversation } = await supabaseClient
      .from('conversations')
      .select('id')
      .eq('guest_phone', normalizedPhone)
      .eq('property_id', property_id)
      .single();

    if (existingConversation) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Conversation already exists',
          conversation: existingConversation,
          isNewConversation: false
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Créer une nouvelle conversation
    const conversationData = {
      property_id: property_id,
      guest_name: guest_name,
      guest_phone: normalizedPhone,
      guest_number: normalizedPhone,
      check_in_date: check_in_date || null,
      check_out_date: check_out_date || null,
      status: 'active',
      last_message: `Nouvelle réservation créée pour ${guest_name}`,
      last_message_at: new Date().toISOString(),
      unread_count: 0,
      priority_level: 1
    };

    const { data: newConversation, error: createError } = await supabaseClient
      .from('conversations')
      .insert(conversationData)
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // Vérifier si l'envoi automatique de template de bienvenue est activé
    const { data: property } = await supabaseClient
      .from('properties')
      .select('host_id')
      .eq('id', property_id)
      .single();

    if (property) {
      try {
        // Récupérer la configuration des templates WhatsApp depuis la base de données
        console.log('Vérification de la configuration des templates pour host_id:', property.host_id);
        
        // Modification: utiliser select() au lieu de single() pour gérer plusieurs configurations
        const { data: templateConfigs, error: templateError } = await supabaseClient
          .from('whatsapp_template_config')
          .select('*')
          .eq('host_id', property.host_id);
        
        // Déclarer templateConfig1 en dehors du bloc if
        let templateConfig1 = null;
        
        if (templateError || !templateConfigs || templateConfigs.length === 0) {
          console.log('Erreur récupération config template ou config non trouvée:', templateError?.message || 'Aucune configuration trouvée');
          console.log('Pas de configuration template trouvée, templates désactivés par défaut');
          // Si pas de configuration trouvée, ne pas envoyer de template
          let shouldSendTemplate = false;
          let actualTemplateName = null;
        } else {
          // Si plusieurs configurations existent, prendre la première et logger un avertissement
          if (templateConfigs.length > 1) {
            console.log(`ATTENTION: ${templateConfigs.length} configurations trouvées pour host_id ${property.host_id}. Utilisation de la première.`);
          }
          
          // Utiliser la première configuration (ou la seule)
          templateConfig1 = templateConfigs[0];
          
          // Utiliser la configuration réelle depuis la base de données
          // CORRECTION DU BUG : vérifier auto_templates_enabled ET send_welcome_template
          const autoTemplatesEnabled = templateConfig1.auto_templates_enabled;
          const templateEnabled = templateConfig1.send_welcome_template;
          const templateName = templateConfig1.welcome_template_name;
          // Template envoyé SEULEMENT si auto_templates_enabled ET send_welcome_template sont vrais
          let shouldSendTemplate = autoTemplatesEnabled && templateEnabled && templateName;
          let actualTemplateName = templateName;
          console.log('Configuration template récupérée depuis la base de données:', {
            auto_templates_enabled: autoTemplatesEnabled,
            send_welcome_template: templateEnabled,
            welcome_template_name: templateName,
            decision: shouldSendTemplate
          });
        }

        if (shouldSendTemplate) {
          // Envoyer le template de bienvenue via l'API WhatsApp
          const templateResponse = await fetch('http://localhost:8080/send-whatsapp-template', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              template_name: actualTemplateName,
              host_id: property.host_id,
              to: normalizedPhone,
              guest_name: guest_name,
              property_id: property_id
            })
          });

          if (templateResponse.ok) {
            welcomeMessageResult = { success: true, template_sent: whatsappConfig.welcome_template };
          } else {
            welcomeMessageResult = { success: false, reason: "Erreur lors de l'envoi du template" };
          }
        }
      } catch (templateError) {
        console.error('Erreur lors de l\'envoi du template de bienvenue:', templateError);
        welcomeMessageResult = { success: false, reason: "Erreur technique lors de l'envoi" };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Conversation created successfully',
        conversation: newConversation,
        isNewConversation: true,
        welcomeMessage: welcomeMessageResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error creating conversation:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to create conversation',
        details: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})