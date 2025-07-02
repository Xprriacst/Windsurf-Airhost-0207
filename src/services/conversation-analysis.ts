/**
 * Service d'analyse de conversations pour Airbnb
 * Remplace l'ancien système d'analyse d'urgence par un système de tags plus sophistiqué
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

class ConversationAnalysisService {
  
  /**
   * Analyse une conversation et identifie les situations nécessitant une attention
   */
  async analyzeConversation(
    messages: Message[],
    conversationId?: string,
    apartmentId?: string,
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
      // Utiliser GPT-4o pour analyser la conversation
      const analysisResult = await this._callOpenAI(messages, customInstructions || '', 'analysis');
      const analysis = JSON.parse(analysisResult);
      
      return {
        needsAttention: analysis.needsAttention || false,
        conversationTag: analysis.conversationTag || null,
        confidence: analysis.confidence || 0.5,
        explanation: analysis.explanation || 'Analyse effectuée par IA',
        recommendedAction: analysis.recommendedAction || 'Continuer la conversation normalement',
        priority: this._determinePriority(analysis.conversationTag)
      };
    } catch (error) {
      console.error('[ConversationAnalysis] Erreur analyse OpenAI:', error);
      // Fallback vers analyse par mots-clés
      const lastMessage = messages[messages.length - 1];
      return this._analyzeWithKeywords(lastMessage.content.toLowerCase());
    }
  }

  /**
   * Génération de réponse IA avec instructions personnalisées
   */
  async generateAIResponse(
    messages: Message[],
    conversationId?: string,
    apartmentId?: string,
    customInstructions?: string
  ): Promise<{ response: string; confidence: number }> {
    
    if (!messages || messages.length === 0) {
      return {
        response: 'Bonjour ! Comment puis-je vous aider ?',
        confidence: 1.0
      };
    }

    try {
      // Utiliser GPT-4o pour générer une réponse
      const response = await this._callOpenAI(messages, customInstructions || '', 'response');
      
      return {
        response: response || 'Désolé, je ne peux pas répondre pour le moment.',
        confidence: 0.9
      };
    } catch (error) {
      console.error('[ConversationAnalysis] Erreur génération réponse:', error);
      // Fallback en cas d'erreur
      const lastMessage = messages[messages.length - 1];
      return this._generateFallbackResponse(lastMessage.content.toLowerCase());
    }
  }

  /**
   * Appel à l'API OpenAI GPT-4o via notre service Python local
   */
  private async _callOpenAI(messages: Message[], customInstructions: string, type: 'response' | 'analysis'): Promise<string> {
    const conversationHistory = messages.map(msg => {
      return `${msg.direction === 'inbound' ? 'Guest' : 'Host'}: ${msg.content}`;
    }).join('\n');

    let systemPrompt = '';
    if (type === 'response') {
      systemPrompt = `Tu es un assistant virtuel pour un logement Airbnb. Analyse d'abord le message de l'invité pour comprendre son besoin, puis réponds de manière appropriée et personnalisée.

Instructions spécifiques pour ce logement :
${customInstructions}

ANALYSE LE MESSAGE POUR IDENTIFIER :
- S'il s'agit d'une urgence (chauffage, électricité, plomberie, sécurité)
- Le type de demande (information, problème technique, plainte, question générale)
- Le niveau de priorité

RÈGLES DE RÉPONSE :
- Réponds uniquement en français
- Pour les urgences : reconnais immédiatement le problème, exprime de l'empathie, propose des actions concrètes
- Pour les problèmes techniques : propose des solutions immédiates si possible, sinon assure que l'hôte sera contacté
- Sois professionnel mais empathique
- Évite les réponses génériques

Conversation actuelle :
${conversationHistory}

IMPORTANT : Lis attentivement le dernier message de l'invité et réponds de manière spécifique à sa situation :`;
    } else {
      systemPrompt = `Tu es un système d'analyse de conversations pour des communications Airbnb. Analyse le message suivant et identifie le type de situation nécessitant une attention particulière.

Conversation :
${conversationHistory}

TYPES DE TAGS DE CONVERSATION :
- "Client mécontent" : Client exprimant une insatisfaction, plainte ou frustration
- "IA incertaine" : Question complexe où l'IA n'est pas sûre de sa réponse
- "Intervention hôte requise" : Check-in/check-out, problèmes techniques spécifiques, demandes personnalisées
- "Urgence critique" : Problème de sécurité, panne grave, situation d'urgence réelle
- "Escalade comportementale" : Ton agressif, menaces, comportement inapproprié
- "Réponse connue" : Question standard dont l'IA connaît la réponse

Réponds uniquement par un objet JSON avec cette structure exacte :
{
  "needsAttention": boolean,
  "conversationTag": "Client mécontent" | "IA incertaine" | "Intervention hôte requise" | "Urgence critique" | "Escalade comportementale" | "Réponse connue" | null,
  "confidence": number (0-1),
  "explanation": "explication en français détaillant pourquoi ce tag a été choisi",
  "recommendedAction": "suggestion d'action pour l'hôte"
}`;
    }

    try {
      // Appel direct à l'API OpenAI
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true
      });

      console.log(`[ConversationAnalysis] Appel direct à l'API OpenAI`);
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: messages[messages.length - 1]?.content || 'Bonjour' }
        ],
        max_tokens: type === 'response' ? 500 : 200,
        temperature: 0.7,
        ...(type === 'analysis' && { response_format: { type: "json_object" } })
      });

      const result = response.choices[0]?.message?.content || '';
      
      if (type === 'analysis') {
        return result || '{}';
      } else {
        return result || 'Désolé, je ne peux pas répondre pour le moment.';
      }
      
    } catch (error) {
      console.error('[ConversationAnalysis] Erreur OpenAI:', error);
      throw error;
    }
  }

  /**
   * Détermine la priorité selon le tag de conversation
   */
  private _determinePriority(tag: string | null): 'low' | 'medium' | 'high' | 'urgent' {
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
   * Analyse par mots-clés en fallback
   */
  private _analyzeWithKeywords(content: string): ConversationAnalysis {
    const urgentKeywords = ['urgence', 'urgent', 'aide', 'problème grave', 'danger', 'sécurité', 'fuite', 'panne'];
    const dissatisfactionKeywords = ['mécontent', 'déçu', 'problème', 'plainte', 'insatisfait', 'pas content'];
    const aggressiveKeywords = ['inacceptable', 'scandaleux', 'exige', 'menace', 'avocat'];
    const checkinKeywords = ['check-in', 'check-out', 'clés', 'arrivée', 'départ', 'code'];

    let tag: ConversationAnalysis['conversationTag'] = null;
    let priority: ConversationAnalysis['priority'] = 'low';
    let explanation = 'Analyse basée sur des mots-clés';
    let recommendedAction = 'Continuer la conversation normalement';

    if (urgentKeywords.some(keyword => content.includes(keyword))) {
      tag = 'Urgence critique';
      priority = 'urgent';
      explanation = 'Mots-clés d\'urgence détectés';
      recommendedAction = 'Intervention immédiate de l\'hôte requise';
    } else if (aggressiveKeywords.some(keyword => content.includes(keyword))) {
      tag = 'Escalade comportementale';
      priority = 'high';
      explanation = 'Ton agressif détecté';
      recommendedAction = 'Contacter l\'hôte pour gérer la situation';
    } else if (dissatisfactionKeywords.some(keyword => content.includes(keyword))) {
      tag = 'Client mécontent';
      priority = 'high';
      explanation = 'Signes d\'insatisfaction détectés';
      recommendedAction = 'Répondre avec empathie et proposer une solution';
    } else if (checkinKeywords.some(keyword => content.includes(keyword))) {
      tag = 'Intervention hôte requise';
      priority = 'medium';
      explanation = 'Question sur check-in/check-out détectée';
      recommendedAction = 'L\'hôte devrait répondre directement';
    }

    return {
      needsAttention: tag !== null,
      conversationTag: tag,
      confidence: 0.7,
      explanation,
      recommendedAction,
      priority
    };
  }

  /**
   * Génère une réponse de fallback
   */
  private _generateFallbackResponse(content: string): { response: string; confidence: number } {
    const greetingKeywords = ['bonjour', 'salut', 'hello', 'bonsoir'];
    const thanksKeywords = ['merci', 'thanks'];
    const questionsKeywords = ['?', 'comment', 'où', 'quand', 'pourquoi'];

    if (greetingKeywords.some(keyword => content.includes(keyword))) {
      return {
        response: 'Bonjour ! Bienvenue dans notre logement. Comment puis-je vous aider ?',
        confidence: 0.8
      };
    } else if (thanksKeywords.some(keyword => content.includes(keyword))) {
      return {
        response: 'Je vous en prie ! N\'hésitez pas si vous avez d\'autres questions.',
        confidence: 0.8
      };
    } else if (questionsKeywords.some(keyword => content.includes(keyword))) {
      return {
        response: 'Je comprends votre question. Pour vous donner une réponse précise, je vais transmettre votre demande à votre hôte qui vous répondra rapidement.',
        confidence: 0.6
      };
    }

    return {
      response: 'Merci pour votre message. Votre hôte vous répondra dans les plus brefs délais.',
      confidence: 0.5
    };
  }
}

export const conversationAnalysis = new ConversationAnalysisService();
export type { ConversationAnalysis };