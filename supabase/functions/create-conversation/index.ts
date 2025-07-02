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
    const { data: whatsappConfig } = await supabaseClient
      .from('whatsapp_config')
      .select('auto_welcome_enabled, welcome_template, phone_number_id, token')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    let welcomeMessageResult = { success: false, reason: "Configuration WhatsApp manquante" };

    if (whatsappConfig?.auto_welcome_enabled && whatsappConfig.welcome_template) {
      try {
        // Récupérer l'ID de la propriété pour envoyer le template
        const { data: property } = await supabaseClient
          .from('properties')
          .select('host_id')
          .eq('id', property_id)
          .single();

        if (property) {
          // Envoyer le template de bienvenue via l'API WhatsApp
          const templateResponse = await fetch('http://localhost:8080/send-whatsapp-template', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              template_name: whatsappConfig.welcome_template,
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