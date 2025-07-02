/**
 * Service de remplacement pour les fonctions Netlify d'analyse d'urgence
 * Utilise l'API OpenAI GPT-4o pour fournir les mêmes fonctionnalités que les Edge Functions originales
 */

interface Message {
  content: string;
  direction: 'inbound' | 'outbound';
  timestamp?: string;
}

interface ConversationAnalysis {
  needsAttention: boolean;
  conversationTag: 'Client mécontent' | 'IA incertaine' | 'Intervention hôte requise' | 'Urgence critique' | 'Escalade comportementale' | 'Réponse connue' | null;
  confidence: number;
  explanation: string;
  recommendedAction: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

class EmergencyAPIService {
  
  /**
   * Analyse de conversation (remplace /netlify/functions/analyze-emergency)
   */
  async analyzeConversation(
    messages: Message[],
    customInstructions?: string
  ): Promise<ConversationAnalysis> {
    
    if (!messages || messages.length === 0) {
      return {
        needsAttention: false,
        conversationTag: null,
        confidence: 1.0,
        explanation: 'Aucun message à analyser',
        recommendedAction: 'Aucune action nécessaire',
        priority: 'low'
      };
    }

    try {
      // Utiliser le service OpenAI local avec GPT-4o
      const analysisResult = await this._callOpenAI(messages, customInstructions || '', 'analysis');
      const analysis = JSON.parse(analysisResult);
      
      return {
        needsAttention: analysis.needsAttention || false,
        conversationTag: analysis.conversationTag || null,
        confidence: analysis.confidence || 0.5,
        explanation: analysis.explanation || 'Analyse effectuée par IA',
        recommendedAction: analysis.recommendedAction || 'Continuer la conversation normalement',
        priority: this._mapTagToPriority(analysis.conversationTag)
      };
    } catch (error) {
      console.error('[EmergencyAPI] Erreur analyse OpenAI:', error);
      // Fallback vers analyse par mots-clés
      const lastMessage = messages[messages.length - 1];
      return this._analyzeMessageContentFallback(lastMessage.content.toLowerCase());
    }
  }

  /**
   * Génération de réponse IA (remplace /netlify/functions/generate-ai-response)
   */
  async generateAIResponse(
    messages: Message[],
    customInstructions?: string
  ): Promise<{ response: string; confidence: number }> {
    
    if (!messages || messages.length === 0) {
      return {
        response: 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?',
        confidence: 1.0
      };
    }

    try {
      // Utiliser GPT-4o via le proxy
      const response = await this._callOpenAIDirectly(messages, customInstructions || '', 'response');
      
      return {
        response: response || 'Désolé, je ne peux pas répondre pour le moment.',
        confidence: 0.9
      };
    } catch (error) {
      console.error('[EmergencyAPI] Erreur OpenAI:', error);
      // Fallback en cas d'erreur
      const lastMessage = messages[messages.length - 1];
      return this._generateContextualResponse(lastMessage.content.toLowerCase());
    }
  }

  /**
   * Appel à l'API OpenAI GPT-4o
   */
  private async _callOpenAI(messages: Message[], customInstructions: string, type: 'response' | 'analysis'): Promise<string> {
    const conversationHistory = messages.map(msg => {
      return `${msg.direction === 'inbound' ? 'Guest' : 'Host'}: ${msg.content}`;
    }).join('\n');

    let systemPrompt = '';
    if (type === 'response') {
      systemPrompt = `Tu es un assistant virtuel pour un logement Airbnb. Réponds aux questions des invités de manière personnalisée et chaleureuse.

Instructions spécifiques pour ce logement :
${customInstructions}

Règles importantes :
- Réponds uniquement en français
- Sois chaleureux et professionnel
- Utilise les informations spécifiques du logement si disponibles
- Si tu n'as pas l'information, propose de contacter l'hôte directement
- Reste dans le contexte Airbnb/location saisonnière

Conversation actuelle :
${conversationHistory}

Réponds au dernier message de l'invité de manière appropriée :`;
    } else {
      systemPrompt = `Tu es un système d'analyse d'urgence pour des communications Airbnb. Analyse le message suivant et détermine s'il s'agit d'une urgence.

Conversation :
${conversationHistory}

Réponds uniquement par un JSON avec cette structure exacte :
{
  "isEmergency": boolean,
  "emergencyType": "Urgence critique" | "Client mécontent" | "Escalade comportementale" | "IA incertaine" | null,
  "confidence": number (0-1),
  "unknownResponse": boolean,
  "explanation": "explication en français"
}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(import.meta as any)?.env?.VITE_OPENAI_API_KEY || 'sk-test-key'}`
      },
      body: JSON.stringify({
        model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: messages[messages.length - 1]?.content || 'Bonjour' }
        ],
        max_tokens: type === 'response' ? 500 : 200,
        temperature: 0.7,
        ...(type === 'analysis' && { response_format: { type: "json_object" } })
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Désolé, je ne peux pas répondre pour le moment.';
  }



  /**
   * Appel direct à l'API OpenAI GPT-4o (legacy)
   */
  private async _callOpenAIDirectly(messages: Message[], customInstructions: string, type: 'response' | 'analysis'): Promise<string> {
    const conversationHistory = messages.map(msg => {
      return `${msg.direction === 'inbound' ? 'Guest' : 'Host'}: ${msg.content}`;
    }).join('\n');

    let systemPrompt = '';
    if (type === 'response') {
      systemPrompt = `Tu es un assistant virtuel pour un logement Airbnb. Réponds aux questions des invités de manière personnalisée et chaleureuse.

Instructions spécifiques pour ce logement :
${customInstructions}

Règles importantes :
- Réponds uniquement en français
- Sois chaleureux et professionnel
- Utilise les informations spécifiques du logement si disponibles
- Si tu n'as pas l'information, propose de contacter l'hôte directement
- Reste dans le contexte Airbnb/location saisonnière

Conversation actuelle :
${conversationHistory}

Réponds au dernier message de l'invité de manière appropriée :`;
    } else {
      systemPrompt = `Tu es un système d'analyse d'urgence pour des communications Airbnb. Analyse le message suivant et détermine s'il s'agit d'une urgence.

Conversation :
${conversationHistory}

Réponds uniquement par un JSON avec cette structure exacte :
{
  "isEmergency": boolean,
  "emergencyType": "Urgence critique" | "Client mécontent" | "Escalade comportementale" | "IA incertaine" | null,
  "confidence": number (0-1),
  "unknownResponse": boolean,
  "explanation": "explication en français"
}`;
    }

    // Appel direct à l'API OpenAI avec la clé API dans les headers
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(import.meta as any)?.env?.VITE_OPENAI_API_KEY || 'sk-test-key'}`
      },
      body: JSON.stringify({
        model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: messages[messages.length - 1]?.content || 'Bonjour' }
        ],
        max_tokens: type === 'response' ? 500 : 200,
        temperature: 0.7,
        ...(type === 'analysis' && { response_format: { type: "json_object" } })
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erreur OpenAI API:', response.status, errorData);
      throw new Error(`OpenAI API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Désolé, je ne peux pas répondre pour le moment.';
  }

  /**
   * Détermine la priorité selon le tag de conversation
   */
  private _mapTagToPriority(tag: string | null): 'low' | 'medium' | 'high' | 'urgent' {
    switch (tag) {
      case 'Urgence critique':
        return 'urgent';
      case 'Escalade comportementale':
        return 'high';
      case 'Client mécontent':
        return 'high';
      case 'Intervention hôte requise':
        return 'medium';
      case 'IA incertaine':
        return 'medium';
      case 'Réponse connue':
        return 'low';
      default:
        return 'low';
    }
  }

  /**
   * Analyse basée sur mots-clés pour détecter les urgences (fallback compatible)
   */
  private _analyzeMessageContentFallback(content: string): ConversationAnalysis {
    // Mots-clés pour urgences critiques
    const criticalKeywords = [
      'urgent', 'fuite', 'inondation', 'panne', 'cassé', 
      'plus d\'eau', 'plus de chauffage', 'incendie', 'urgence', 
      'inondé', 'danger', 'secours', 'aide'
    ];
    
    // Mots-clés pour plaintes
    const complaintKeywords = [
      'déçu', 'mécontent', 'sale', 'pas propre', 'problème', 
      'pas satisfait', 'mauvais', 'décevant', 'nul', 'horrible'
    ];
    
    // Mots-clés pour escalade comportementale
    const behavioralKeywords = [
      'inacceptable', 'remboursement', 'avis négatif', 'scandaleux', 
      'arnaque', 'menace', 'avocat', 'pourri', 'justice'
    ];
    
    // Mots-clés positifs
    const positiveKeywords = [
      'merci', 'parfait', 'excellent', 'satisfait', 'bien', 
      'super', 'impeccable', 'génial', 'formidable', 'resto', 'restaurant'
    ];

    if (criticalKeywords.some(keyword => content.includes(keyword))) {
      return {
        needsAttention: true,
        conversationTag: 'Urgence critique',
        confidence: 0.9,
        explanation: 'Mots-clés d\'urgence détectés dans le message',
        recommendedAction: 'Intervention immédiate de l\'hôte requise',
        priority: 'urgent'
      };
    }

    if (behavioralKeywords.some(keyword => content.includes(keyword))) {
      return {
        needsAttention: true,
        conversationTag: 'Escalade comportementale',
        confidence: 0.8,
        explanation: 'Comportement agressif ou menaces détectées',
        recommendedAction: 'Contacter l\'hôte pour gérer la situation',
        priority: 'high'
      };
    }

    if (complaintKeywords.some(keyword => content.includes(keyword))) {
      return {
        needsAttention: true,
        conversationTag: 'Client mécontent',
        confidence: 0.7,
        explanation: 'Signes d\'insatisfaction détectés',
        recommendedAction: 'Répondre avec empathie et proposer une solution',
        priority: 'high'
      };
    }

    if (positiveKeywords.some(keyword => content.includes(keyword))) {
      return {
        needsAttention: false,
        conversationTag: 'Réponse connue',
        confidence: 0.8,
        explanation: 'Message standard ou positif détecté',
        recommendedAction: 'Continuer la conversation normalement',
        priority: 'low'
      };
    }

    // Par défaut : analyse incertaine
    return {
      needsAttention: true,
      conversationTag: 'IA incertaine',
      confidence: 0.4,
      explanation: 'Impossible de déterminer le type de message avec certitude',
      recommendedAction: 'Intervention manuelle requise',
      priority: 'medium'
    };
  }



  /**
   * Génération de réponses contextuelles
   */
  private _generateContextualResponse(content: string): { response: string; confidence: number } {
    if (content.includes('wifi') || content.includes('internet')) {
      return {
        response: 'Le code WiFi est affiché dans le logement, généralement près de la box internet ou sur le frigo. Si vous ne le trouvez pas, n\'hésitez pas à me le signaler.',
        confidence: 0.9
      };
    }
    
    if (content.includes('check-in') || content.includes('arrivée') || content.includes('clés')) {
      return {
        response: 'Pour votre arrivée, vous recevrez les instructions détaillées par email 24h avant. Les clés se trouvent dans la boîte sécurisée dont vous recevrez le code.',
        confidence: 0.9
      };
    }
    
    if (content.includes('parking') || content.includes('stationnement')) {
      return {
        response: 'Les informations de stationnement sont dans le guide du logement. Un parking public se trouve à proximité si nécessaire.',
        confidence: 0.8
      };
    }
    
    if (content.includes('restaurant') || content.includes('manger')) {
      return {
        response: 'Je peux vous recommander d\'excellents restaurants dans le quartier ! Vous trouverez mes suggestions dans le guide du logement.',
        confidence: 0.8
      };
    }
    
    if (content.includes('transport') || content.includes('métro') || content.includes('bus')) {
      return {
        response: 'Le logement est bien desservi par les transports. La station la plus proche est indiquée dans le guide avec les principales lignes.',
        confidence: 0.8
      };
    }
    
    return {
      response: 'Merci pour votre message. Je vais vérifier les informations et vous répondre rapidement. N\'hésitez pas si vous avez d\'autres questions !',
      confidence: 0.7
    };
  }
}

// Instance singleton
export const emergencyAPI = new EmergencyAPIService();
export type { ConversationAnalysis, Message };