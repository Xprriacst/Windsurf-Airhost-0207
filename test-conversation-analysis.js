// Test script for the new conversation analysis system
async function testConversationAnalysis() {
  console.log('=== TESTING NEW CONVERSATION ANALYSIS SYSTEM ===');
  
  // Test different message types
  const testCases = [
    {
      messages: [{
        content: 'Je ne suis pas content de la chambre, elle ne correspond pas à ce qui était promis',
        direction: 'inbound'
      }],
      description: 'Client dissatisfaction test'
    },
    {
      messages: [{
        content: 'À quelle heure est le check-in ?',
        direction: 'inbound'
      }],
      description: 'Host intervention needed test'
    },
    {
      messages: [{
        content: 'Il y a une fuite d\'eau dans la salle de bain !',
        direction: 'inbound'
      }],
      description: 'Critical emergency test'
    },
    {
      messages: [{
        content: 'C\'est inacceptable ! Je vais contacter mon avocat !',
        direction: 'inbound'
      }],
      description: 'Behavioral escalation test'
    }
  ];

  // Direct API call to test GPT-4o integration
  for (const testCase of testCases) {
    console.log(`\nTesting: ${testCase.description}`);
    console.log(`Message: ${testCase.messages[0].content}`);
    
    try {
      const conversationHistory = testCase.messages.map(msg => {
        return `${msg.direction === 'inbound' ? 'Guest' : 'Host'}: ${msg.content}`;
      }).join('\n');

      const systemPrompt = `Tu es un système d'analyse de conversations pour des communications Airbnb. Analyse le message suivant et identifie le type de situation nécessitant une attention particulière.

Conversation :
${conversationHistory}

TYPES DE TAGS DE CONVERSATION :
- "Client mécontent" : Client exprimant une insatisfaction, plainte ou frustration
- "IA incertaine" : Question complexe où l'IA n'est pas sûre de sa réponse
- "Intervention hôte requise" : Check-in/check-out, problèmes techniques spécifiques, demandes personnalisées
- "Urgence critique" : Problème de sécurité, panne grave, situation d'urgence réelle
- "Escalade comportementale" : Ton agressif, menaces, comportement inapproprié

Réponds uniquement par un JSON avec cette structure exacte :
{
  "needsAttention": boolean,
  "conversationTag": "Client mécontent" | "IA incertaine" | "Intervention hôte requise" | "Urgence critique" | "Escalade comportementale" | null,
  "confidence": number (0-1),
  "explanation": "explication en français détaillant pourquoi ce tag a été choisi",
  "recommendedAction": "suggestion d'action pour l'hôte"
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: testCase.messages[0].content }
          ],
          max_tokens: 200,
          temperature: 0.7,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        console.error(`OpenAI API Error: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      const analysisResult = JSON.parse(data.choices[0].message.content);
      
      console.log('✓ Analysis Result:');
      console.log(`  Tag: ${analysisResult.conversationTag || 'None'}`);
      console.log(`  Needs Attention: ${analysisResult.needsAttention}`);
      console.log(`  Confidence: ${analysisResult.confidence}`);
      console.log(`  Explanation: ${analysisResult.explanation}`);
      console.log(`  Recommended Action: ${analysisResult.recommendedAction}`);
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
    
    console.log('---');
  }
}

testConversationAnalysis().catch(console.error);