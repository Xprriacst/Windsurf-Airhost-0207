import { supabase } from '../../lib/supabase';

export interface WhatsAppConfig {
  phone_number_id: string;
  token: string;
  auto_welcome_enabled?: boolean;
  welcome_template?: string;
  send_welcome_template?: boolean;
  welcome_template_name?: string;
  created_at?: string;
  updated_at?: string;
}

export class WhatsAppService {
  static async getConfig(): Promise<WhatsAppConfig | null> {
    try {
      console.log("[WhatsAppService] v3.1.0 - Récupération configuration WhatsApp avec templates...");
      
      // Récupérer la configuration de base depuis Supabase
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error("Erreur lors de la récupération de la configuration WhatsApp:", error);
        return null;
      }
      
      console.log("Configuration de base récupérée:", data);
      
      if (data && data.length > 0) {
        const baseConfig = data[0] as WhatsAppConfig;
        
        // Ajouter les paramètres de templates depuis le stockage en mémoire
        const templateConfig = this.getTemplateConfig();
        const mergedConfig = {
          ...baseConfig,
          send_welcome_template: templateConfig.send_welcome_template,
          welcome_template_name: templateConfig.welcome_template_name,
          auto_welcome_enabled: templateConfig.auto_templates_enabled
        };
        
        console.log("Configuration complète avec templates:", mergedConfig);
        return mergedConfig;
      }
      
      console.log("Aucune configuration WhatsApp trouvée");
      return null;
    } catch (err) {
      console.error("Exception lors de la récupération de la configuration WhatsApp:", err);
      return null;
    }
  }

  // Stockage temporaire des paramètres de templates
  private static templateConfig: any = null;

  static async saveConfig(config: any): Promise<boolean> {
    try {
      console.log("[WhatsAppService] v4.0.0 - Sauvegarde avec support templates:", config);
      
      // Préparer les données de base avec les paramètres de templates
      const dataToSave: any = {
        phone_number_id: config.phone_number_id,
        token: config.token,
        updated_at: new Date().toISOString()
      };
      
      // Stocker les paramètres de templates en mémoire ET localStorage pour persistance
      if (config.send_welcome_template !== undefined || config.welcome_template_name !== undefined) {
        this.templateConfig = {
          send_welcome_template: config.send_welcome_template || false,
          welcome_template_name: config.welcome_template_name || '',
          auto_templates_enabled: config.send_welcome_template || false,
          template_language: 'fr',
          fallback_message: 'Bienvenue ! Nous reviendrons vers vous rapidement.'
        };
        
        // Stocker les paramètres de templates dans un champ JSON pour contourner les limitations de schéma
        const templateSettings = {
          template_enabled: config.send_welcome_template || false,
          welcome_template: config.welcome_template_name || '',
          welcome_message: 'Bienvenue ! Nous reviendrons vers vous rapidement.'
        };
        
        // Utiliser un champ existant pour stocker la configuration JSON des templates
        dataToSave.config_json = JSON.stringify(templateSettings);
        
        // Sauvegarder dans localStorage pour persistance
        try {
          localStorage.setItem('whatsapp_template_config', JSON.stringify(this.templateConfig));
          console.log("Templates configurés et sauvegardés:", this.templateConfig);
        } catch (error) {
          console.warn("Impossible de sauvegarder dans localStorage:", error);
        }
      }
      
      console.log("Données à sauvegarder en base:", dataToSave);
      
      // Vérifier s'il y a déjà une configuration
      const { data: existing, error: selectError } = await supabase
        .from('whatsapp_config')
        .select('id')
        .limit(1);
      
      if (selectError) {
        console.error("Erreur lors de la vérification:", selectError);
        return false;
      }
      
      let result;
      if (existing && existing.length > 0) {
        // Mise à jour
        console.log("Mise à jour de la configuration existante ID:", existing[0].id);
        result = await supabase
          .from('whatsapp_config')
          .update(dataToSave)
          .eq('id', existing[0].id);
      } else {
        // Création
        console.log("Création d'une nouvelle configuration");
        result = await supabase
          .from('whatsapp_config')
          .insert(dataToSave);
      }
      
      if (result.error) {
        console.error("Erreur lors de la sauvegarde de la configuration WhatsApp:", result.error);
        return false;
      }
      
      console.log("Configuration WhatsApp sauvegardée avec succès");
      return true;
    } catch (err) {
      console.error("Exception lors de la sauvegarde de la configuration WhatsApp:", err);
      return false;
    }
  }

  static getTemplateConfig(): any {
    console.log("Récupération config templates depuis mémoire:", this.templateConfig);
    return this.templateConfig || {
      send_welcome_template: false,
      welcome_template_name: '',
      auto_templates_enabled: false,
      template_language: 'fr',
      fallback_message: 'Bienvenue ! Nous reviendrons vers vous rapidement.'
    };
  }

  // Nouvelle méthode pour précharger la configuration si elle existe
  static async initializeTemplateConfig(): Promise<void> {
    try {
      // Vérifier si une configuration existe déjà dans localStorage
      const saved = localStorage.getItem('whatsapp_template_config');
      if (saved) {
        this.templateConfig = JSON.parse(saved);
        console.log("Configuration templates récupérée depuis localStorage:", this.templateConfig);
      }
    } catch (error) {
      console.log("Aucune configuration template sauvegardée trouvée");
    }
  }

  static async sendWelcomeTemplate(to: string, guestName: string, templateName?: string): Promise<boolean> {
    try {
      const config = await this.getConfig();
      const templateConfig = this.getTemplateConfig();
      
      if (!config || !templateConfig.send_welcome_template) {
        console.log('Templates de bienvenue désactivés');
        return false;
      }

      const finalTemplateName = templateName || templateConfig.welcome_template_name;
      
      if (!finalTemplateName) {
        console.log('Aucun template spécifié, envoi du message de fallback');
        return await this.sendMessage(to, templateConfig.fallback_message);
      }

      console.log('Envoi du template WhatsApp:', { to, templateName: finalTemplateName, guestName });

      const response = await fetch(`https://graph.facebook.com/v18.0/${config.phone_number_id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: finalTemplateName,
            language: {
              code: templateConfig.template_language || 'fr'
            },
            components: [
              {
                type: 'body',
                parameters: [
                  {
                    type: 'text',
                    text: guestName
                  }
                ]
              }
            ]
          }
        }),
      });

      if (!response.ok) {
        console.error('Erreur lors de l\'envoi du template:', await response.text());
        console.log('Tentative avec message de fallback...');
        return await this.sendMessage(to, templateConfig.fallback_message);
      }

      console.log('Template de bienvenue envoyé avec succès');
      return true;
    } catch (err) {
      console.error('Exception lors de l\'envoi du template:', err);
      return false;
    }
  }

  static async sendMessage(to: string, content: string) {
    console.log('[WhatsAppService] DEBUG v1.10.6 - Tentative d\'envoi de message WhatsApp:', { to, content });
    
    try {
      // Récupérer la configuration WhatsApp
      console.log('[WhatsAppService] Avant getConfig()');
      const config = await this.getConfig();
      console.log('[WhatsAppService] Après getConfig(), résultat:', config);
      
      if (!config) {
        console.error('[WhatsAppService] Configuration WhatsApp non trouvée');
        throw new Error('Configuration WhatsApp non trouvée');
      }
      
      console.log('[WhatsAppService] Configuration récupérée, envoi du message...', {
        phone_number_id: config.phone_number_id,
        token_length: config.token ? config.token.length : 0
      });
      
      // Préparer le corps de la requête
      const requestBody = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: content
        }
      };
      
      console.log('[WhatsAppService] Corps de la requête:', JSON.stringify(requestBody));
      console.log('[WhatsAppService] URL de l\'API:', `https://graph.facebook.com/v22.0/${config.phone_number_id}/messages`);
      
      // Appel direct à l'API WhatsApp
      const response = await fetch(
        `https://graph.facebook.com/v22.0/${config.phone_number_id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );
      
      console.log('[WhatsAppService] Réponse reçue, status:', response.status);
      
      const result = await response.json();
      console.log('[WhatsAppService] Réponse JSON:', result);
      
      if (!response.ok) {
        const errorMsg = result?.error?.message || `Erreur ${response.status}: ${response.statusText}`;
        console.error('[WhatsAppService] Erreur lors de l\'envoi du message WhatsApp:', errorMsg, result);
        throw new Error(errorMsg);
      }
      
      console.log('[WhatsAppService] Message WhatsApp envoyé avec succès:', result);
      return result;
    } catch (error) {
      console.error('[WhatsAppService] Erreur lors de l\'envoi du message WhatsApp:', error);
      console.error('[WhatsAppService] Détails de l\'erreur:', error instanceof Error ? error.message : error);
      throw error;
    }
  }
  
  static async sendTemplate(to: string, templateName: string, language: string) {
    console.log('[WhatsAppService] DEBUG v1.10.3 - Tentative d\'envoi de template WhatsApp:', { to, templateName, language });
    
    try {
      // Récupérer la configuration WhatsApp
      console.log('[WhatsAppService] Avant getConfig()');
      const config = await this.getConfig();
      console.log('[WhatsAppService] Après getConfig(), résultat:', config);
      
      if (!config) {
        console.error('[WhatsAppService] Configuration WhatsApp non trouvée');
        throw new Error('Configuration WhatsApp non trouvée');
      }
      
      console.log('[WhatsAppService] Configuration récupérée, envoi du template...', {
        phone_number_id: config.phone_number_id,
        token_length: config.token ? config.token.length : 0
      });
      
      // Préparer le corps de la requête
      const requestBody = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: language
          }
        },
      };
      
      console.log('[WhatsAppService] Corps de la requête:', JSON.stringify(requestBody));
      console.log('[WhatsAppService] URL de l\'API:', `https://graph.facebook.com/v22.0/${config.phone_number_id}/messages`);
      
      // Appel direct à l'API WhatsApp
      const response = await fetch(
        `https://graph.facebook.com/v22.0/${config.phone_number_id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );
      
      console.log('[WhatsAppService] Réponse reçue, status:', response.status);
      
      const result = await response.json();
      console.log('[WhatsAppService] Réponse JSON:', result);
      
      if (!response.ok) {
        const errorMsg = result?.error?.message || `Erreur ${response.status}: ${response.statusText}`;
        console.error('[WhatsAppService] Erreur lors de l\'envoi du template WhatsApp:', errorMsg, result);
        throw new Error(errorMsg);
      }
      
      console.log('[WhatsAppService] Template WhatsApp envoyé avec succès:', result);
      return result;
    } catch (error) {
      console.error('[WhatsAppService] Erreur lors de l\'envoi du template WhatsApp:', error);
      console.error('[WhatsAppService] Détails de l\'erreur:', error instanceof Error ? error.message : error);
      throw error;
    }
  }
}
