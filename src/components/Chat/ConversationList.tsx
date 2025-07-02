import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Box, 
  List, 
  ListItem, 
  Typography, 
  Avatar, 
  Badge,
  Divider,
  Chip
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Conversation } from '../../types/conversation';

interface ConversationListProps {
  conversations: Conversation[];
  onSelectConversation: (conversation: Conversation) => void;
  onConversationUpdate?: () => void;  // Callback optionnel pour notifier le parent des mises à jour
}

export default function ConversationList({ conversations, onSelectConversation, onConversationUpdate }: ConversationListProps) {
  useEffect(() => {
    // Souscrire aux changements en temps réel
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Configuration de la souscription Realtime dans ConversationList`);
    
    // Utiliser un nom de canal plus spécifique pour éviter les conflits
    const channel = supabase
      .channel('public:conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          const updateTimestamp = new Date().toISOString();
          console.log(`[${updateTimestamp}] REALTIME: Changement détecté dans les conversations:`, payload);
          console.log(`[${updateTimestamp}] REALTIME: Type d'événement:`, payload.eventType);
          console.log(`[${updateTimestamp}] REALTIME: Données:`, payload.new);
          
          // Vérifier si les données de payload sont valides
          if (payload.new && payload.eventType) {
            // Notifier le composant parent pour qu'il rafraîchisse les données
            if (onConversationUpdate) {
              console.log(`[${updateTimestamp}] REALTIME: Notification au parent pour mise à jour des conversations`);
              onConversationUpdate();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`[${new Date().toISOString()}] Status de la souscription conversations:`, status);
      });

    return () => {
      console.log(`[${new Date().toISOString()}] Nettoyage de la souscription ConversationList`);
      supabase.removeChannel(channel);
    };
  }, [onConversationUpdate]); // Ajouter onConversationUpdate comme dépendance
  
  // Effet pour le débogage des changements dans la liste des conversations
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log(`RENDU: Liste des conversations mise à jour [${timestamp}]:`, conversations.map(c => ({
      id: c.id,
      guest_name: c.guest_name,
      last_message: c.last_message,
      last_message_at: c.last_message_at,
      _refreshTimestamp: c._refreshTimestamp
    })));
  }, [conversations]);

  // Fonction pour générer les initiales à partir du nom
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  // Fonction pour analyser le message et détecter automatiquement le tag
  const analyzeMessageForTag = (message: string | null) => {
    if (!message) return null;
    
    const messageText = message.toLowerCase();
    
    // Mots-clés pour "Urgence critique"
    if (messageText.includes('urgent') || 
        messageText.includes('chauffage') || 
        messageText.includes('froid') ||
        messageText.includes('panne') ||
        messageText.includes('rapidement') ||
        messageText.includes('technicien')) {
      return 'Urgence critique';
    }
    
    // Mots-clés pour "Client mécontent"
    if (messageText.includes('mécontent') || 
        messageText.includes('insatisfait') || 
        messageText.includes('problème') ||
        messageText.includes('déçu')) {
      return 'Client mécontent';
    }
    
    return null;
  };

  // Fonction pour obtenir la couleur et le style du tag d'analyse
  const getTagStyle = (tag: string | null) => {
    if (!tag) return null;
    
    switch (tag) {
      case 'Urgence critique':
        return { color: 'error' as const, variant: 'filled' as const };
      case 'Escalade comportementale':
        return { color: 'error' as const, variant: 'outlined' as const };
      case 'Client mécontent':
        return { color: 'warning' as const, variant: 'filled' as const };
      case 'Intervention hôte requise':
        return { color: 'info' as const, variant: 'filled' as const };
      case 'IA incertaine':
        return { color: 'secondary' as const, variant: 'outlined' as const };
      case 'Réponse connue':
        return { color: 'success' as const, variant: 'outlined' as const };
      default:
        return { color: 'default' as const, variant: 'outlined' as const };
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {conversations.length === 0 ? (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          p: 3,
          height: '100%',
          textAlign: 'center'
        }}>
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            Aucune conversation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Les nouvelles conversations apparaîtront ici
          </Typography>
        </Box>
      ) : (
        <List sx={{ width: '100%', p: 0, overflowY: 'auto' }}>
          {conversations.map((conversation) => (
            <div key={`${conversation.id}-${conversation._refreshTimestamp || 'initial'}`}>
              <ListItem
                onClick={() => onSelectConversation(conversation)}
                sx={{
                  py: 2,
                  px: 2,
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.04)',
                  },
                  cursor: 'pointer'
                }}
              >
                <Badge
                  badgeContent={conversation.unread_count || 0}
                  color="primary"
                  invisible={!conversation.unread_count}
                  overlap="circular"
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  sx={{ 
                    mr: 2,
                    '& .MuiBadge-badge': {
                      fontSize: '0.75rem',
                      height: '20px',
                      minWidth: '20px',
                      padding: '0 6px',
                      borderRadius: '10px',
                    }
                  }}
                >
                  <Avatar 
                    sx={{ 
                      bgcolor: conversation.unread_count ? '#3b82f6' : '#94a3b8',
                      width: 48,
                      height: 48
                    }}
                  >
                    {getInitials(conversation.guest_name)}
                  </Avatar>
                </Badge>
                <Box sx={{ flex: 1, ml: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Box>
                      <Typography 
                        variant="subtitle1" 
                        component="div"
                        fontWeight={conversation.unread_count ? 600 : 400}
                        sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}
                      >
                        {conversation.guest_name}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        component="div"
                        color="text.secondary"
                        sx={{ fontSize: '0.7rem', mt: 0.2 }}
                      >
                        {conversation.guest_phone}
                      </Typography>
                    </Box>
                    <Typography 
                      variant="caption" 
                      component="div"
                      color="text.secondary" 
                      sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap', ml: 1 }}
                    >
                      {formatDistanceToNow(new Date(conversation.last_message_at), {
                        addSuffix: true,
                        locale: fr
                      })}
                    </Typography>
                  </Box>
                  
                  <Typography 
                    variant="body2" 
                    component="div"
                    color="text.secondary"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '250px',
                      fontWeight: conversation.unread_count ? 600 : 400,
                      color: conversation.unread_count ? 'text.primary' : 'text.secondary',
                      mb: 0.5
                    }}
                  >
                    {conversation.last_message || 'Nouvelle conversation'}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography 
                      variant="caption" 
                      component="div"
                      color="text.secondary"
                      sx={{ fontSize: '0.75rem' }}
                    >
                      {conversation.property?.[0]?.name || ''}
                    </Typography>
                    {(() => {
                      const detectedTag = analyzeMessageForTag(conversation.last_message || null);
                      const tagStyle = getTagStyle(detectedTag);
                      return tagStyle ? (
                        <Chip
                          label={detectedTag}
                          size="small"
                          color={tagStyle.color}
                          variant={tagStyle.variant}
                          sx={{ 
                            fontSize: '0.65rem',
                            height: '18px',
                            '& .MuiChip-label': {
                              px: 0.5
                            }
                          }}
                        />
                      ) : null;
                    })()}
                  </Box>
                </Box>
              </ListItem>
              <Divider />
            </div>
          ))}
        </List>
      )}
    </Box>
  );
}
