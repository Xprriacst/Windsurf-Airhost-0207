import { useEffect, useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Paper, CircularProgress } from '@mui/material';
import { supabaseAdmin } from '../lib/supabase-admin';

interface Conversation {
  id: string;
  guest_name: string;
  guest_phone: string;
  last_message: string;
  last_message_at: string;
  property: any;
}

export default function WhatsAppConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      console.log('[WHATSAPP] Récupération des conversations...');
      
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      console.log('[WHATSAPP] Réponse:', { data, error, count: data?.length });

      if (error) {
        throw error;
      }

      // Éliminer les doublons de conversations basés sur guest_phone
      const uniqueConversations = (data || []).reduce((acc: Conversation[], current: Conversation) => {
        const existing = acc.find(conv => conv.guest_phone === current.guest_phone);
        if (!existing) {
          acc.push(current);
        } else if (new Date(current.last_message_at) > new Date(existing.last_message_at)) {
          // Remplacer par la conversation plus récente
          const index = acc.findIndex(conv => conv.guest_phone === current.guest_phone);
          acc[index] = current;
        }
        return acc;
      }, []);

      console.log('[WHATSAPP] Conversations après déduplication:', uniqueConversations.length);
      setConversations(uniqueConversations);
    } catch (err: any) {
      console.error('[WHATSAPP] Erreur:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Chargement des conversations WhatsApp...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Erreur: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Conversations WhatsApp ({conversations.length})
      </Typography>
      
      {conversations.length === 0 ? (
        <Typography>Aucune conversation trouvée</Typography>
      ) : (
        <List>
          {conversations.map((conversation) => (
            <ListItem key={conversation.id} component={Paper} sx={{ mb: 1, p: 2 }}>
              <ListItemText
                primary={conversation.guest_name}
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {conversation.guest_phone}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      "{conversation.last_message}"
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(conversation.last_message_at).toLocaleString()}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}