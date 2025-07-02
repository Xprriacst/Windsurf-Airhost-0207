// Réponses de secours par type d'appartement, utilisées si la fonction Netlify échoue
const FALLBACK_RESPONSES: Record<string, string[]> = {
  // Réponses génériques (ID 0 ou inconnu)
  '0': [
    "Bonjour ! Je serais ravi de vous aider concernant cet appartement. Que souhaitez-vous savoir exactement ?",
    "Merci pour votre message. Avez-vous des questions spécifiques sur l'emplacement, les équipements ou les disponibilités ?",
    "Bonjour ! Je suis à votre disposition pour toute information sur cet appartement. N'hésitez pas à me poser vos questions."
  ],
  // On peut ajouter d'autres IDs d'appartements avec des réponses spécifiques
};

// Interface pour les réponses de l'API
interface AIResponseData {
  response: string;
  confidence: number;
  isUncertain?: boolean;
}

export class AIResponseService {
  static async generateResponse(apartmentId: string, conversationId: string, customInstructions?: string) {
    console.log('[AIResponseService] Début de generateResponse avec:', { apartmentId, conversationId });
    
    try {
      // Utiliser notre service local de génération de réponses IA avec GPT-4o
      const { conversationAnalysis } = await import('./conversation-analysis');
      
      // Récupérer l'historique de conversation réel depuis Supabase
      const { supabase } = await import('../lib/supabase');
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('content, direction, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(10); // Récupérer les 10 derniers messages pour le contexte
      
      if (error) {
        console.error('[AIResponseService] Erreur récupération messages:', error);
        // Fallback avec message générique si erreur
        const messages = [
          { content: 'Message générique pour génération de réponse', direction: 'inbound' as const }
        ];
      } else {
        console.log('[AIResponseService] Messages récupérés:', messagesData);
      }
      
      const messages = messagesData && messagesData.length > 0 
        ? messagesData.map(msg => ({
            content: msg.content,
            direction: msg.direction as 'inbound' | 'outbound'
          }))
        : [{ content: 'Message générique pour génération de réponse', direction: 'inbound' as const }];
      
      console.log('[AIResponseService] Génération de réponse avec notre service local GPT-4o...');
      
      // Générer une réponse IA en utilisant notre service
      const aiResponse = await conversationAnalysis.generateAIResponse(
        messages,
        conversationId,
        apartmentId,
        customInstructions || ''
      );
      
      console.log('[AIResponseService] Réponse IA générée avec succès:', aiResponse.response);
      
      // Analyser également la conversation pour détecter d'éventuels cas d'urgence
      if (aiResponse.confidence < 0.7) {
        console.log('[AIResponseService] Incertitude détectée dans la réponse (confidence < 0.7)');
        
        // Notification de l'incertitude au service d'analyse
        try {
          await this.notifyUncertainty(conversationId);
        } catch (notifyError) {
          console.error('[AIResponseService] Erreur lors de la notification d\'incertitude:', notifyError);
        }
      }
      
      return aiResponse.response;
      
    } catch (error) {
      console.error('[AIResponseService] Erreur lors de la génération de la réponse:', error);
      console.log('[AIResponseService] Utilisation d\'une réponse de secours...');
      
      // Utiliser une réponse de secours en cas d'erreur
      const fallbackResponses = FALLBACK_RESPONSES[apartmentId] || FALLBACK_RESPONSES['0'];
      const randomIndex = Math.floor(Math.random() * fallbackResponses.length);
      return fallbackResponses[randomIndex];
    }
  }
  
  /**
   * Notifie le service d'analyse de conversation qu'une incertitude a été détectée
   * @param conversationId L'ID de la conversation concernée
   */
  private static async notifyUncertainty(conversationId: string) {
    console.log('[AIResponseService] Notification d\'incertitude au service d\'analyse de conversation');
    
    try {
      // Utiliser notre service local d'analyse de conversation avec GPT-4o
      const { conversationAnalysis } = await import('./conversation-analysis');
      
      // Analyser la situation d'incertitude
      const incertaintyMessages = [{ content: 'Incertitude détectée dans la réponse IA', direction: 'inbound' as const }];
      const analysis = await conversationAnalysis.analyzeConversation(incertaintyMessages, conversationId, '');
      
      console.log('[AIResponseService] Analyse d\'incertitude:', analysis.conversationTag);
      console.log('[AIResponseService] Tag assigné:', analysis.conversationTag);
      console.log('[AIResponseService] Priorité:', analysis.priority);
      console.log('[AIResponseService] Notification d\'incertitude envoyée avec succès');
    } catch (error) {
      console.error('[AIResponseService] Erreur lors de la notification d\'incertitude:', error);
    }
  }
}