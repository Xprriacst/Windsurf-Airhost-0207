import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  Container
} from '@mui/material';
import {
  Warning,
  Error,
  Build,
  CheckCircle,
  Psychology
} from '@mui/icons-material';

const EmergencyCases: React.FC = () => {
  const conversationTags = [
    {
      tag: 'Urgence critique',
      icon: <Error />,
      color: 'error' as const,
      priority: 'URGENT',
      description: 'Problème de sécurité, panne grave, situation d\'urgence réelle',
      examples: [
        'Fuite d\'eau importante',
        'Panne de chauffage en hiver', 
        'Problème de sécurité',
        'Urgence médicale'
      ],
      action: 'Intervention immédiate requise'
    },
    {
      tag: 'Escalade comportementale',
      icon: <Warning />,
      color: 'error' as const,
      priority: 'ÉLEVÉE',
      description: 'Ton agressif, menaces, comportement inapproprié',
      examples: [
        'Messages agressifs',
        'Menaces verbales',
        'Comportement inapproprié',
        'Escalade du conflit'
      ],
      action: 'Intervention humaine prioritaire'
    },
    {
      tag: 'Client mécontent',
      icon: <Warning />,
      color: 'warning' as const,
      priority: 'ÉLEVÉE',
      description: 'Client exprimant une insatisfaction, plainte ou frustration',
      examples: [
        'Plainte sur la propreté',
        'Insatisfaction du service',
        'Problème avec les équipements',
        'Attentes non respectées'
      ],
      action: 'Gestion personnalisée requise'
    },
    {
      tag: 'Intervention hôte requise',
      icon: <Build />,
      color: 'info' as const,
      priority: 'MOYENNE',
      description: 'Check-in/check-out, problèmes techniques spécifiques, demandes personnalisées',
      examples: [
        'Problème de check-in',
        'Demande de clés supplémentaires',
        'Question sur les équipements',
        'Assistance technique'
      ],
      action: 'Coordination avec l\'hôte nécessaire'
    },
    {
      tag: 'IA incertaine',
      icon: <Psychology />,
      color: 'info' as const,
      priority: 'MOYENNE',
      description: 'Question complexe où l\'IA n\'est pas sûre de sa réponse',
      examples: [
        'Information non mentionnée dans les instructions',
        'Question ambiguë',
        'Demande nécessitant clarification',
        'Contexte insuffisant'
      ],
      action: 'Révision humaine recommandée'
    },
    {
      tag: 'Réponse connue',
      icon: <CheckCircle />,
      color: 'success' as const,
      priority: 'FAIBLE',
      description: 'Question standard dont l\'IA connaît la réponse',
      examples: [
        'Questions sur les horaires',
        'Informations disponibles dans les instructions',
        'Salutations de courtoisie',
        'Demandes d\'information standard'
      ],
      action: 'Réponse automatique appropriée'
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return '#d32f2f';
      case 'ÉLEVÉE': return '#f57c00';
      case 'MOYENNE': return '#1976d2';
      case 'FAIBLE': return '#388e3c';
      default: return '#757575';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Tags de conversation analysés par GPT-4o
      </Typography>
      
      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body2">
          <strong>Analyse intelligente :</strong> L'IA GPT-4o analyse automatiquement chaque conversation 
          et attribue le tag approprié selon le contenu, le contexte et l'urgence de la situation.
          Cette analyse se fait en temps réel, sans délai.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {conversationTags.map((item, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                border: `2px solid ${getPriorityColor(item.priority)}`,
                '&:hover': {
                  boxShadow: 6,
                  transform: 'translateY(-2px)',
                  transition: 'all 0.3s ease'
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ mr: 2, color: getPriorityColor(item.priority) }}>
                    {item.icon}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Chip 
                      label={item.tag} 
                      color={item.color}
                      size="medium"
                      sx={{ mb: 1 }}
                    />
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'block',
                        fontWeight: 'bold',
                        color: getPriorityColor(item.priority)
                      }}
                    >
                      PRIORITÉ {item.priority}
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                  {item.description}
                </Typography>

                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Exemples typiques :
                </Typography>
                <Box sx={{ mb: 2 }}>
                  {item.examples.map((example, idx) => (
                    <Typography 
                      key={idx} 
                      variant="caption" 
                      sx={{ 
                        display: 'block', 
                        ml: 1,
                        '&:before': { content: '"• "' }
                      }}
                    >
                      {example}
                    </Typography>
                  ))}
                </Box>

                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'grey.50', 
                    borderRadius: 1,
                    borderLeft: `4px solid ${getPriorityColor(item.priority)}`
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    Action recommandée :
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.action}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Alert severity="success" sx={{ mt: 4 }}>
        <Typography variant="body2">
          <strong>Technologie :</strong> Ce système utilise GPT-4o (dernière version d'OpenAI sortie en mai 2024) 
          pour une analyse contextuelle avancée, bien plus précise que les systèmes basés sur des mots-clés.
        </Typography>
      </Alert>
    </Container>
  );
};

export default EmergencyCases;