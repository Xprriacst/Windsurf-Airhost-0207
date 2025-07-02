import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Grid,
  Container,
  CircularProgress,
  Alert
} from '@mui/material';
import { supabase } from '../lib/supabase';

interface Conversation {
  id: string;
  guest_name: string;
  guest_phone: string;
  last_message: string;
  last_message_at: string;
  status: string;
  created_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  content: string;
  direction: 'inbound' | 'outbound';
  status: string;
  created_at: string;
  type: string;
}

const getTagColor = (tag: string) => {
  switch (tag) {
    case 'Urgence critique':
      return 'error';
    case 'Client mécontent':
      return 'warning';
    case 'Intervention hôte requise':
      return 'info';
    case 'IA incertaine':
      return 'secondary';
    case 'Escalade comportementale':
      return 'error';
    case 'Réponse connue':
      return 'success';
    default:
      return 'default';
  }
};

const ConversationsPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<{ [key: string]: Message[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      
      // Récupérer les conversations
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false });

      if (conversationsError) {
        throw conversationsError;
      }

      setConversations(conversationsData || []);

      // Récupérer les messages pour chaque conversation
      if (conversationsData && conversationsData.length > 0) {
        const conversationIds = conversationsData.map(conv => conv.id);
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: true });

        if (messagesError) {
          throw messagesError;
        }

        // Grouper les messages par conversation
        const messagesByConversation: { [key: string]: Message[] } = {};
        messagesData?.forEach(message => {
          if (!messagesByConversation[message.conversation_id]) {
            messagesByConversation[message.conversation_id] = [];
          }
          messagesByConversation[message.conversation_id].push(message);
        });

        setMessages(messagesByConversation);
      }

    } catch (err: any) {
      setError(err.message);
      console.error('Erreur lors du chargement des conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 2 }}>
          Erreur lors du chargement: {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Conversations WhatsApp
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 3 }}>
          {conversations.length} conversation{conversations.length > 1 ? 's' : ''} trouvée{conversations.length > 1 ? 's' : ''}
        </Typography>

        <Grid container spacing={3}>
          {conversations.map((conversation) => {
            const conversationMessages = messages[conversation.id] || [];
            const firstMessage = conversationMessages[0];
            
            return (
              <Grid item xs={12} md={6} lg={4} key={conversation.id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6" component="h2" gutterBottom>
                        {conversation.guest_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {conversation.guest_phone}
                      </Typography>
                    </Box>

                    {firstMessage && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {firstMessage.content}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ mb: 2 }}>
                      <Chip
                        label={conversation.status}
                        color="primary"
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Chip
                        label={`${conversationMessages.length} message${conversationMessages.length > 1 ? 's' : ''}`}
                        variant="outlined"
                        size="small"
                      />
                    </Box>

                    <Typography variant="caption" color="text.secondary">
                      Créée le {new Date(conversation.created_at).toLocaleString('fr-FR')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {conversations.length === 0 && (
          <Box textAlign="center" sx={{ mt: 4 }}>
            <Typography variant="h6" color="text.secondary">
              Aucune conversation trouvée
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Les conversations WhatsApp apparaîtront ici une fois reçues
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default ConversationsPage;