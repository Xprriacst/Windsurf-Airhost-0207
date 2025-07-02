import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaHome, FaComments, FaExclamationTriangle, FaFlask, FaWhatsapp, FaSignOutAlt } from 'react-icons/fa';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import './SideMenu.css';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Avatar, Typography, FormControlLabel, Switch, Divider, FormControl, InputLabel, Select, MenuItem, CircularProgress } from '@mui/material';
import { useUser } from '../../lib/auth';
import { WhatsAppService } from '../../services/chat/whatsapp.service';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactElement;
  onClick?: () => void;
}

const SideMenu: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [configOpen, setConfigOpen] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendWelcomeTemplate, setSendWelcomeTemplate] = useState(false);
  const [welcomeTemplateName, setWelcomeTemplateName] = useState('');
  const [availableTemplates, setAvailableTemplates] = useState<Array<{name: string, id: string, status: string, language: string, display_name?: string}>>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Récupérer l'utilisateur connecté
  const user = useUser();

  // Fonction pour récupérer les templates WhatsApp disponibles
  const fetchAvailableTemplates = async (phoneNumberId: string, token: string) => {
    if (!phoneNumberId || !token) {
      console.log('⚠️ Phone Number ID ou token manquant pour récupérer les templates');
      setLoadingTemplates(false);
      return;
    }
    
    setLoadingTemplates(true);
    try {
      console.log('🔄 Récupération des templates pour Phone Number ID:', phoneNumberId);
      
      const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/message_templates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const approvedTemplates = data.data?.filter((template: any) => 
          template.status === 'APPROVED'
        ) || [];
        
        setAvailableTemplates(approvedTemplates);
        console.log('✅ Templates WhatsApp récupérés:', approvedTemplates);
        
        if (approvedTemplates.length === 0) {
          console.warn('⚠️ Aucun template approuvé trouvé');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn('❌ Erreur API Facebook:', response.status, errorData);
        
        // Fallback: ajouter manuellement le template hello_world connu
        const fallbackTemplates = [
          {
            name: 'hello_world',
            id: 'hello_world',
            status: 'APPROVED',
            language: 'fr'
          }
        ];
        setAvailableTemplates(fallbackTemplates);
        console.log('⚡ Utilisation du template fallback hello_world');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des templates:', error);
      
      // Fallback: ajouter manuellement le template hello_world connu
      const fallbackTemplates = [
        {
          name: 'hello_world',
          id: 'hello_world',
          status: 'APPROVED',
          language: 'fr'
        }
      ];
      setAvailableTemplates(fallbackTemplates);
      console.log('⚡ Utilisation du template fallback hello_world après erreur');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Erreur lors de la déconnexion:', error);
        toast.error('Erreur lors de la déconnexion');
      } else {
        toast.success('Vous avez été déconnecté avec succès');
        navigate('/login');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Une erreur est survenue');
    }
  };

  const openWhatsAppConfig = async () => {
    console.log('Ouverture de la configuration WhatsApp via service WhatsApp');
    toast.info('Chargement de la configuration WhatsApp...');
    
    try {
      // Récupérer la configuration de base depuis Supabase
      const config = await WhatsAppService.getConfig();
      
      // Récupérer les paramètres de templates depuis localStorage
      const savedTemplateSettings = localStorage.getItem('whatsapp_template_settings');
      let templateSettings = {
        send_welcome_template: false,
        welcome_template_name: 'hello_world'
      };
      
      if (savedTemplateSettings) {
        try {
          templateSettings = { ...templateSettings, ...JSON.parse(savedTemplateSettings) };
          console.log('Paramètres de templates récupérés depuis localStorage:', templateSettings);
        } catch (e) {
          console.warn('Erreur lors du parsing des paramètres de templates:', e);
        }
      }
      
      console.log('Configuration WhatsApp récupérée:', config);
      
      if (config) {
        setPhoneNumberId(config.phone_number_id || '');
        setWhatsappToken(config.token || '');
        setSendWelcomeTemplate(templateSettings.send_welcome_template);
        setWelcomeTemplateName(templateSettings.welcome_template_name);
        
        // Récupérer automatiquement les templates disponibles si on a les credentials
        if (config.phone_number_id && config.token) {
          await fetchAvailableTemplates(config.phone_number_id, config.token);
        } else {
          // Initialiser avec hello_world en premier pour les tests
          const fallbackTemplates = [
            {
              name: 'hello_world',
              id: 'hello_world',
              status: 'APPROVED',
              language: 'en',
              display_name: 'hello_world · English (US)'
            },
            {
              name: 'bienvenue_airhost',
              id: 'bienvenue_airhost',
              status: 'APPROVED',
              language: 'fr',
              display_name: 'Bienvenue Airhost (Français)'
            }
          ];
          setAvailableTemplates(fallbackTemplates);
          console.log('Templates fallback initialisés');
        }
      } else {
        console.log('Aucune configuration WhatsApp trouvée, utilisation des valeurs par défaut');
        toast.info('Aucune configuration WhatsApp existante.');
        
        // Utiliser les paramètres de templates depuis localStorage
        setSendWelcomeTemplate(templateSettings.send_welcome_template);
        setWelcomeTemplateName(templateSettings.welcome_template_name);
        
        // Initialiser avec hello_world en premier pour les tests
        const fallbackTemplates = [
          {
            name: 'hello_world',
            id: 'hello_world',
            status: 'APPROVED',
            language: 'en',
            display_name: 'hello_world · English (US)'
          },
          {
            name: 'bienvenue_airhost',
            id: 'bienvenue_airhost',
            status: 'APPROVED',
            language: 'fr',
            display_name: 'Bienvenue Airhost (Français)'
          }
        ];
        setAvailableTemplates(fallbackTemplates);
      }

      // Force l'ouverture de la popup
      setConfigOpen(true);
      console.log('État configOpen:', true);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Une erreur est survenue');
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      console.log('Début de la sauvegarde de la configuration WhatsApp...');
      
      // Validation des champs requis
      if (!phoneNumberId || !whatsappToken) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        setSaving(false);
        return;
      }
      
      // Préparer les données de configuration de base
      const configData = {
        phone_number_id: phoneNumberId,
        token: whatsappToken
      };
      
      // Préparer les paramètres de templates pour localStorage
      const templateSettings = {
        send_welcome_template: sendWelcomeTemplate,
        welcome_template_name: welcomeTemplateName,
        available_templates: availableTemplates.map(t => t.name)
      };
      
      console.log("Sauvegarde configuration de base:", configData);
      console.log("Sauvegarde paramètres de templates:", templateSettings);
      
      // Sauvegarder la configuration de base via le service WhatsApp
      const success = await WhatsAppService.saveConfig(configData);
      
      if (!success) {
        console.error("Erreur lors de la sauvegarde de la configuration WhatsApp");
        toast.error('Erreur lors de la sauvegarde de la configuration');
        setSaving(false);
        return;
      }
      
      // Sauvegarder les paramètres de templates dans localStorage
      try {
        localStorage.setItem('whatsapp_template_settings', JSON.stringify(templateSettings));
        console.log("Paramètres de templates sauvegardés dans localStorage");
      } catch (error) {
        console.warn("Erreur lors de la sauvegarde des paramètres de templates:", error);
      }
      
      console.log("Configuration WhatsApp sauvegardée avec succès");
      toast.success('Configuration WhatsApp sauvegardée !');
      setConfigOpen(false);
      setSaving(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Une erreur est survenue lors de la sauvegarde');
      setSaving(false);
    }
  };

  const mainMenuItems: MenuItem[] = [
    { path: '/chat', label: 'Conversations', icon: <FaComments /> },
    { path: '/properties', label: 'Appartements', icon: <FaHome /> },
    { path: '/emergency', label: 'Cas d\'urgence', icon: <FaExclamationTriangle /> },
    { path: '/sandbox', label: 'Chat Sandbox', icon: <FaFlask /> },
  ];

  const bottomMenuItems: MenuItem[] = [
    { 
      path: '#', 
      label: 'Configuration WhatsApp', 
      icon: <FaWhatsapp />,
      onClick: openWhatsAppConfig
    },
    { 
      path: '#', 
      label: 'SE DÉCONNECTER', 
      icon: <FaSignOutAlt />,
      onClick: handleLogout
    },
  ];

  const renderMenuItem = (item: MenuItem, index: number) => (
    <Link
      key={`${item.path}-${item.label}-${index}`}
      to={item.onClick ? '#' : item.path}
      className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
      onClick={item.onClick}
    >
      <span className="menu-icon">{item.icon}</span>
      <span className="menu-label">{item.label}</span>
    </Link>
  );

  return (
    <>
      <div className="side-menu">
        <div className="user-info">
          <Avatar className="avatar">{user?.user_metadata?.name?.[0]}</Avatar>
          <div>
            <Typography variant="subtitle1">{user?.user_metadata?.name}</Typography>
            <Typography variant="caption" color="textSecondary">
              {user?.email}
            </Typography>
          </div>
        </div>
        <div className="menu-header">
          <h2 className="app-title">AirHost Admin</h2>
        </div>
        <nav className="menu-nav">
          {mainMenuItems.map((item, index) => renderMenuItem(item, index))}
        </nav>
        <nav className="menu-nav bottom-nav">
          {bottomMenuItems.map((item, index) => renderMenuItem(item, index))}
        </nav>
        

      </div>

      {/* Dialog de configuration WhatsApp */}
      <Dialog 
        open={configOpen} 
        onClose={() => {
          console.log('Fermeture du dialog');
          setConfigOpen(false);
        }} 
        maxWidth="sm" 
        fullWidth
        sx={{ zIndex: 1400 }}
      >
        <DialogTitle>Configuration WhatsApp</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Phone Number ID"
              variant="outlined"
              fullWidth
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="Entrez votre Phone Number ID WhatsApp"
            />
            <TextField
              label="Token WhatsApp"
              variant="outlined"
              fullWidth
              value={whatsappToken}
              onChange={(e) => setWhatsappToken(e.target.value)}
              type="password"
              placeholder="Entrez votre token WhatsApp"
            />
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="h6" sx={{ mb: 1 }}>
              Templates de bienvenue automatique
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={sendWelcomeTemplate}
                  onChange={(e) => setSendWelcomeTemplate(e.target.checked)}
                  color="primary"
                />
              }
              label="Envoyer automatiquement un template de bienvenue aux nouveaux clients"
            />
            
            {sendWelcomeTemplate && (
              <>
                <FormControl fullWidth sx={{ mt: 1 }}>
                  <InputLabel id="template-select-label">Template de bienvenue</InputLabel>
                  <Select
                    labelId="template-select-label"
                    id="template-select"
                    value={welcomeTemplateName}
                    label="Template de bienvenue"
                    onChange={(e) => setWelcomeTemplateName(e.target.value)}
                    disabled={loadingTemplates}
                  >
                    {loadingTemplates ? (
                      <MenuItem disabled>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Chargement des templates...
                      </MenuItem>
                    ) : [
                        ...availableTemplates.map((template) => (
                          <MenuItem key={template.id} value={template.name}>
                            {template.display_name || `${template.name} (${template.language})`}
                          </MenuItem>
                        )),
                        <MenuItem key="custom" value="custom">
                          <em>Saisir manuellement...</em>
                        </MenuItem>
                      ]}
                  </Select>
                </FormControl>
                
                {(welcomeTemplateName === 'custom' || (availableTemplates.length === 0 && !loadingTemplates)) && (
                  <TextField
                    label="Nom du template personnalisé"
                    variant="outlined"
                    fullWidth
                    value={welcomeTemplateName === 'custom' ? '' : welcomeTemplateName}
                    onChange={(e) => setWelcomeTemplateName(e.target.value)}
                    placeholder="ex: hello_world, welcome_message"
                    helperText="Saisissez le nom exact du template configuré dans Meta Business"
                    sx={{ mt: 1 }}
                  />
                )}
              </>
            )}
            
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2, fontStyle: 'italic' }}>
              Les templates sont stockés temporairement et seront appliqués lors de la création de nouvelles conversations.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              console.log('Annulation de la configuration');
              setConfigOpen(false);
            }}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleSaveConfig} 
            variant="contained" 
            color="primary"
            disabled={saving}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SideMenu;
