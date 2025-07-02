/**
 * Service OpenAI intégré pour Airhost
 * Utilise l'API OpenAI GPT-4o pour générer des réponses et analyser les urgences
 */

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

class OpenAIService {
  private baseURL = 'https://api.openai.com/v1/chat/completions';

  /**
   * Génère une réponse IA pour un message d'invité
   */
  async generateResponse(messages: any[], customInstructions: string): Promise<string> {
    const conversationHistory = messages.map(msg => {
      return `${msg.direction === 'inbound' ? 'Guest' : 'Host'}: ${msg.content}`;
    }).join('\n');

    const systemPrompt = `Tu es un assistant virtuel pour un logement Airbnb. Réponds aux questions des invités de manière personnalisée et chaleureuse.

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

    return this.callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: messages[messages.length - 1]?.content || 'Bonjour' }
    ], false);
  }

  /**
   * Analyse un message pour détecter les urgences
   */
  async analyzeEmergency(messages: any[], customInstructions: string): Promise<any> {
    const conversationHistory = messages.map(msg => {
      return `${msg.direction === 'inbound' ? 'Guest' : 'Host'}: ${msg.content}`;
    }).join('\n');

    const systemPrompt = `Tu es un système d'analyse d'urgence pour des communications Airbnb. Analyse le message suivant et détermine s'il s'agit d'une urgence.

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

    const result = await this.callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: messages[messages.length - 1]?.content || 'Test' }
    ], true);

    try {
      return JSON.parse(result);
    } catch (error) {
      // Fallback si le JSON n'est pas valide
      return {
        isEmergency: true,
        emergencyType: "IA incertaine",
        confidence: 0.5,
        unknownResponse: true,
        explanation: "Impossible d'analyser le message avec certitude"
      };
    }
  }

  /**
   * Appel direct à l'API OpenAI
   */
  private async callOpenAI(messages: OpenAIMessage[], isJsonMode: boolean): Promise<string> {
    // Pour Replit, nous devons utiliser une approche différente pour accéder à la clé API
    // Je vais demander à l'utilisateur de fournir la clé API si nécessaire
    
    const requestBody = {
      model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: messages,
      max_tokens: isJsonMode ? 200 : 500,
      temperature: 0.7,
      ...(isJsonMode && { response_format: { type: "json_object" } })
    };

    // Simuler un appel OpenAI pour le moment
    // L'utilisateur devra fournir la clé API pour que cela fonctionne réellement
    throw new Error('API OpenAI non configurée - veuillez fournir la clé API');
  }
}

export const openAIService = new OpenAIService();