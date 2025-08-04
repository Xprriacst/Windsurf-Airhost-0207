import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Snackbar,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Typography
} from '@mui/material';
import { WhatsAppConfig as WhatsAppConfigType } from '../../../services/chat/whatsapp.service';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';

interface WhatsAppConfigProps {
  open: boolean;
  onClose: () => void;
}

export default function WhatsAppConfig({ open, onClose }: WhatsAppConfigProps) {
  const { user } = useAuth();
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Nouveaux états pour les templates de bienvenue
  const [autoWelcomeEnabled, setAutoWelcomeEnabled] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [availableTemplates, setAvailableTemplates] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open]);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      console.log('Tentative de récupération de la configuration WhatsApp via RPC directe...');
      
      // Utiliser directement la fonction RPC sans passer par le service
      const { data, error } = await supabase.rpc('get_whatsapp_config');
      
      if (error) {
        console.error('Erreur lors de l\'appel RPC:', error);
        throw error;
      }
      
      console.log('Configuration WhatsApp récupérée via RPC directe:', data);
      
      if (data) {
        const config = data as WhatsAppConfigType;
        setPhoneNumberId(config.phone_number_id || '');
        setWhatsappToken(config.token || '');
      }
      
      // Charger les paramètres de template depuis la nouvelle table
      await loadTemplateConfig();
      
      // Charger la liste des templates disponibles
      await loadAvailableTemplates();
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration WhatsApp:', error);
      setErrorMessage('Erreur lors du chargement de la configuration WhatsApp');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplateConfig = async () => {
    try {
      console.log('Chargement de la configuration des templates...');
      
      // Récupérer la configuration des templates depuis la nouvelle table
      // Utiliser l'ID de test pour le moment (à remplacer par la vraie logique d'hôte)
      const { data: templateData, error: templateError } = await supabase
        .from('whatsapp_template_config')
        .select('send_welcome_template, welcome_template_name, auto_templates_enabled')
        .eq('host_id', user.id)
        .single();
      
      if (templateError && templateError.code !== 'PGRST116') {
        console.error('Erreur lors du chargement de la config template:', templateError);
      } else if (templateData) {
        console.log('Configuration template récupérée:', templateData);
        // Utiliser auto_templates_enabled pour le toggle principal
        setAutoWelcomeEnabled(templateData.auto_templates_enabled || false);
        setSelectedTemplate(templateData.welcome_template_name || 'hello_world');
      } else {
        console.log('Aucune configuration template trouvée, utilisation des valeurs par défaut');
        setAutoWelcomeEnabled(false);
        setSelectedTemplate('hello_world');
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration template:', error);
      setAutoWelcomeEnabled(false);
      setSelectedTemplate('hello_world');
    }
  };

  const loadAvailableTemplates = async () => {
    try {
      // Templates prédéfinis communs pour les locations courte durée
      const defaultTemplates = [
        'hello_world',
        'welcome_checkin',
        'welcome_booking_confirmation',
        'welcome_property_info',
        'welcome_contact_host',
        'welcome_custom'
      ];
      
      setAvailableTemplates(defaultTemplates);
    } catch (error) {
      console.error('Erreur lors du chargement des templates:', error);
      // Utiliser des templates par défaut en cas d'erreur
      setAvailableTemplates(['hello_world', 'welcome_checkin']);
    }
  };

  const getTemplateDisplayName = (templateName: string): string => {
    const templateNames: Record<string, string> = {
      'hello_world': 'Bonjour monde (par défaut)',
      'welcome_checkin': 'Bienvenue et instructions d\'arrivée',
      'welcome_booking_confirmation': 'Confirmation de réservation',
      'welcome_property_info': 'Informations sur la propriété',
      'welcome_contact_host': 'Contact hôte disponible',
      'welcome_custom': 'Message personnalisé'
    };
    
    return templateNames[templateName] || templateName;
  };

  const validateFields = () => {
    if (!phoneNumberId.trim()) {
      setErrorMessage('Le Phone Number ID est requis');
      return false;
    }
    if (!whatsappToken.trim()) {
      setErrorMessage('Le Token WhatsApp est requis');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateFields()) return;
    
    setIsSaving(true);
    setErrorMessage('');
    
    try {
      console.log('🔧 DÉBUT SAUVEGARDE WhatsApp Config');
      console.log('📊 État actuel du toggle:', {
        autoWelcomeEnabled,
        selectedTemplate,
        phoneNumberId: phoneNumberId ? '[SET]' : '[EMPTY]',
        whatsappToken: whatsappToken ? '[SET]' : '[EMPTY]'
      });
      
      // 1. Sauvegarder la configuration de base WhatsApp
      const whatsappConfigData = {
        phone_number_id: phoneNumberId,
        token: whatsappToken,
        updated_at: new Date().toISOString()
      };
      
      const { error: whatsappError } = await supabase
        .from('whatsapp_config')
        .upsert(whatsappConfigData);
      
      if (whatsappError) {
        console.error('Erreur lors de la sauvegarde WhatsApp config:', whatsappError);
        throw whatsappError;
      }
      
      // 2. Sauvegarder la configuration des templates
      if (!user?.id) {
        throw new Error('Utilisateur non authentifié');
      }
      
      const templateConfigData = {
        host_id: user.id,
        send_welcome_template: true, // Toujours true - le template est disponible
        welcome_template_name: selectedTemplate,
        auto_templates_enabled: autoWelcomeEnabled, // Contrôlé par le toggle
        updated_at: new Date().toISOString()
      };
      
      console.log('💾 Données template à sauvegarder:', templateConfigData);
      
      const { error: templateError } = await supabase
        .from('whatsapp_template_config')
        .upsert(templateConfigData, {
          onConflict: 'host_id'
        });
      
      if (templateError) {
        console.error('Erreur lors de la sauvegarde template config:', templateError);
        throw templateError;
      }
      
      console.log('✅ Configuration template sauvegardée avec succès');
      
      // Vérification immédiate de la sauvegarde
      const { data: verifyData, error: verifyError } = await supabase
        .from('whatsapp_template_config')
        .select('auto_templates_enabled, send_welcome_template, welcome_template_name')
        .eq('host_id', user.id)
        .single();
      
      if (verifyError) {
        console.error('❌ Erreur lors de la vérification:', verifyError);
      } else {
        console.log('🔍 Vérification post-sauvegarde:', verifyData);
        console.log(`🎯 Toggle sauvegardé: ${verifyData.auto_templates_enabled} (attendu: ${autoWelcomeEnabled})`);
      }
      
      console.log('✅ Configuration WhatsApp sauvegardée avec succès');
      setSuccessMessage('Configuration WhatsApp enregistrée avec succès');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la configuration:', error);
      setErrorMessage('Erreur lors de la sauvegarde de la configuration');
    } finally {
      setIsSaving(false);
    }
  };

  // Version modifiée de handleSave qui accepte la nouvelle valeur du toggle
  // pour éviter le bug de timing avec setState asynchrone
  const handleSaveWithToggleValue = async (newToggleValue: boolean) => {
    if (!validateFields()) return;
    
    setIsSaving(true);
    setErrorMessage('');
    
    try {
      console.log('🔧 DÉBUT SAUVEGARDE WhatsApp Config (avec nouvelle valeur toggle)');
      console.log('📊 État du toggle:', {
        oldValue: autoWelcomeEnabled,
        newValue: newToggleValue,
        selectedTemplate,
        phoneNumberId: phoneNumberId ? '[SET]' : '[EMPTY]',
        whatsappToken: whatsappToken ? '[SET]' : '[EMPTY]'
      });
      
      // 1. Sauvegarder la configuration de base WhatsApp
      const whatsappConfigData = {
        phone_number_id: phoneNumberId,
        token: whatsappToken,
        updated_at: new Date().toISOString()
      };
      
      const { error: whatsappError } = await supabase
        .from('whatsapp_config')
        .upsert(whatsappConfigData);
      
      if (whatsappError) {
        console.error('Erreur lors de la sauvegarde WhatsApp config:', whatsappError);
        throw whatsappError;
      }
      
      // 2. Sauvegarder la configuration des templates avec la NOUVELLE valeur du toggle
      if (!user?.id) {
        throw new Error('Utilisateur non authentifié');
      }
      
      const templateConfigData = {
        host_id: user.id,
        send_welcome_template: true,
        welcome_template_name: selectedTemplate,
        auto_templates_enabled: newToggleValue, // Utiliser la nouvelle valeur, pas l'état React
        updated_at: new Date().toISOString()
      };
      
      console.log('💾 Données template à sauvegarder (avec nouvelle valeur):', templateConfigData);
      
      const { error: templateError } = await supabase
        .from('whatsapp_template_config')
        .upsert(templateConfigData, {
          onConflict: 'host_id'
        });
      
      if (templateError) {
        console.error('Erreur lors de la sauvegarde template config:', templateError);
        throw templateError;
      }
      
      console.log('✅ Configuration template sauvegardée avec succès (nouvelle valeur)');
      
      // Vérification immédiate de la sauvegarde
      const { data: verifyData, error: verifyError } = await supabase
        .from('whatsapp_template_config')
        .select('auto_templates_enabled, send_welcome_template, welcome_template_name')
        .eq('host_id', user.id)
        .single();
      
      if (verifyError) {
        console.error('❌ Erreur lors de la vérification:', verifyError);
      } else {
        console.log('🔍 Vérification post-sauvegarde:', verifyData);
        console.log(`🎯 Toggle sauvegardé: ${verifyData.auto_templates_enabled} (attendu: ${newToggleValue})`);
      }
      
      console.log('✅ Configuration WhatsApp sauvegardée avec succès');
      setSuccessMessage('Configuration WhatsApp enregistrée avec succès');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la configuration:', error);
      setErrorMessage('Erreur lors de la sauvegarde de la configuration');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCloseSnackbar = () => {
    setSuccessMessage('');
    setErrorMessage('');
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Configuration WhatsApp</DialogTitle>
        <DialogContent>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Phone Number ID"
                variant="outlined"
                fullWidth
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="Entrez votre Phone Number ID WhatsApp"
                required
                error={errorMessage.includes('Phone Number ID')}
                helperText="ID de votre numéro de téléphone WhatsApp Business"
              />
              <TextField
                label="Token WhatsApp"
                variant="outlined"
                fullWidth
                value={whatsappToken}
                onChange={(e) => setWhatsappToken(e.target.value)}
                type="password"
                placeholder="Entrez votre token WhatsApp"
                required
                error={errorMessage.includes('Token WhatsApp')}
                helperText="Token d'accès à l'API WhatsApp Business"
              />
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom>
                Messages de bienvenue automatiques
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={autoWelcomeEnabled}
                    onChange={async (e) => {
                      const newValue = e.target.checked;
                      console.log(`🔄 Toggle changé: ${autoWelcomeEnabled} → ${newValue}`);
                      setAutoWelcomeEnabled(newValue);
                      
                      // Sauvegarder automatiquement le changement avec la nouvelle valeur
                      try {
                        await handleSaveWithToggleValue(newValue);
                        console.log('✅ Toggle sauvegardé automatiquement');
                      } catch (error) {
                        console.error('❌ Erreur sauvegarde toggle:', error);
                      }
                    }}
                    color="primary"
                  />
                }
                label="Envoyer automatiquement un message de bienvenue aux nouveaux clients"
              />
              
              {autoWelcomeEnabled && (
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Template de bienvenue</InputLabel>
                  <Select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    label="Template de bienvenue"
                  >
                    {availableTemplates.map((template) => (
                      <MenuItem key={template} value={template}>
                        {getTemplateDisplayName(template)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              <Box sx={{ mt: 2 }}>
                <Alert severity="info">
                  Ces informations sont nécessaires pour envoyer des messages via WhatsApp Business API.
                  Vous pouvez les trouver dans le Meta Business Manager.
                </Alert>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSaving}>Annuler</Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            color="primary"
            disabled={isLoading || isSaving}
          >
            {isSaving ? <CircularProgress size={24} color="inherit" /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar open={!!successMessage} autoHideDuration={4000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
      
      <Snackbar open={!!errorMessage} autoHideDuration={4000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
