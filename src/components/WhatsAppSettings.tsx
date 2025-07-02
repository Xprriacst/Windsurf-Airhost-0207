import React, { useState, useEffect } from 'react';
import {
  Box,
  Stack,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Alert,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  IconButton
} from '@mui/material';
import { Refresh as RefreshIcon, Send as SendIcon } from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import { WhatsAppConfig, WhatsAppTemplate } from '../types/whatsapp-config';

interface WhatsAppSettingsProps {
  hostId: string;
}

export const WhatsAppSettings: React.FC<WhatsAppSettingsProps> = ({ hostId }) => {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWhatsAppConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('host_id', hostId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig(data);
        if (data.available_templates) {
          setTemplates(data.available_templates);
        }
      } else {
        const defaultConfig = {
          id: '',
          host_id: hostId,
          phone_number_id: '',
          access_token: '',
          business_account_id: '',
          webhook_verify_token: '',
          is_active: false,
          send_welcome_message: false,
          welcome_template: 'hello_world',
          available_templates: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setConfig(defaultConfig);
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la configuration:', err);
      setError('Impossible de charger la configuration WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTemplates = async () => {
    if (!config?.business_account_id || !config?.access_token) {
      setError('Veuillez d\'abord configurer l\'ID du compte business et le token d\'accès');
      return;
    }

    setLoadingTemplates(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8080/list-whatsapp-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_account_id: config.business_account_id,
          access_token: config.access_token
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des templates');
      }

      const data = await response.json();
      setTemplates(data.templates || []);
      
      if (config) {
        const updatedConfig = {
          ...config,
          available_templates: data.templates || []
        };
        setConfig(updatedConfig);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des templates:', err);
      setError('Impossible de charger les templates. Vérifiez vos identifiants WhatsApp.');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('whatsapp_config')
        .upsert({
          ...config,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setError('Configuration sauvegardée avec succès');
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError('Erreur lors de la sauvegarde de la configuration');
    } finally {
      setSaving(false);
    }
  };

  const testTemplate = async (templateName: string) => {
    if (!config) return;

    try {
      const response = await fetch('http://localhost:8080/send-whatsapp-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_name: templateName,
          host_id: hostId,
          to: '+33123456789', // Numéro de test
          test_mode: true
        })
      });

      if (response.ok) {
        setError(`Template "${templateName}" envoyé avec succès au numéro de test`);
      } else {
        throw new Error('Erreur lors de l\'envoi du test');
      }
    } catch (err) {
      setError(`Erreur lors du test du template "${templateName}"`);
    }
  };

  useEffect(() => {
    loadWhatsAppConfig();
  }, [hostId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <Typography>Chargement de la configuration WhatsApp...</Typography>
      </Box>
    );
  }

  if (!config) return null;

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Configuration WhatsApp Business
          </Typography>

          {error && (
            <Alert severity={error.includes('succès') ? 'success' : 'error'} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={3}>
            <TextField
              fullWidth
              label="ID du numéro de téléphone"
              value={config.phone_number_id}
              onChange={(e) => setConfig({ ...config, phone_number_id: e.target.value })}
              margin="normal"
              helperText="L'ID du numéro WhatsApp Business fourni par Meta"
            />

            <TextField
              fullWidth
              label="Token d'accès"
              type="password"
              value={config.access_token}
              onChange={(e) => setConfig({ ...config, access_token: e.target.value })}
              margin="normal"
              helperText="Token d'accès à l'API WhatsApp Business"
            />

            <TextField
              fullWidth
              label="ID du compte business"
              value={config.business_account_id}
              onChange={(e) => setConfig({ ...config, business_account_id: e.target.value })}
              margin="normal"
              helperText="L'ID de votre compte WhatsApp Business"
            />

            <TextField
              fullWidth
              label="Token de vérification webhook"
              value={config.webhook_verify_token}
              onChange={(e) => setConfig({ ...config, webhook_verify_token: e.target.value })}
              margin="normal"
              helperText="Token utilisé pour vérifier les webhooks (ex: airhost_webhook_verify_2024)"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={config.is_active}
                  onChange={(e) => setConfig({ ...config, is_active: e.target.checked })}
                />
              }
              label="Activer WhatsApp Business"
            />

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Messages de bienvenue automatiques
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={config.send_welcome_message}
                  onChange={(e) => setConfig({ ...config, send_welcome_message: e.target.checked })}
                />
              }
              label="Envoyer un message de bienvenue lors des nouvelles réservations"
            />

            {config.send_welcome_message && (
              <Box sx={{ mt: 2 }}>
                <Box display="flex" gap={2} alignItems="center" sx={{ mb: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={loadAvailableTemplates}
                    disabled={loadingTemplates}
                  >
                    {loadingTemplates ? 'Chargement...' : 'Charger les templates'}
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    {templates.length} templates disponibles
                  </Typography>
                </Box>

                <FormControl fullWidth margin="normal">
                  <InputLabel>Template de bienvenue</InputLabel>
                  <Select
                    value={config.welcome_template}
                    onChange={(e) => setConfig({ ...config, welcome_template: e.target.value })}
                    label="Template de bienvenue"
                  >
                    <MenuItem value="hello_world">hello_world (template par défaut)</MenuItem>
                    {templates
                      .filter(t => t.status === 'APPROVED')
                      .map((template) => (
                        <MenuItem key={template.name} value={template.name}>
                          {template.name} ({template.language})
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>

                {templates.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Templates disponibles:
                    </Typography>
                    <List dense>
                      {templates.map((template) => (
                        <ListItem
                          key={template.name}
                          secondaryAction={
                            <Box display="flex" gap={1}>
                              <Chip
                                label={template.status}
                                size="small"
                                color={template.status === 'APPROVED' ? 'success' : 'warning'}
                              />
                              {template.status === 'APPROVED' && (
                                <IconButton
                                  size="small"
                                  onClick={() => testTemplate(template.name)}
                                  title="Tester ce template"
                                >
                                  <SendIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                          }
                        >
                          <ListItemText
                            primary={template.name}
                            secondary={`${template.language} • ${template.category}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Box>
            )}

            <Box display="flex" gap={2} sx={{ mt: 3 }}>
              <Button
                variant="contained"
                onClick={saveConfig}
                disabled={saving}
              >
                {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default WhatsAppSettings;