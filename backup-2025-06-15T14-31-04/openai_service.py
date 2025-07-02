#!/usr/bin/env python3
"""
Service OpenAI pour Airhost
Fournit une API REST pour l'analyse d'urgence et la génération de réponses IA
"""

import os
import json
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading
from openai import OpenAI

class OpenAIServiceHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.openai_client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
        super().__init__(*args, **kwargs)

    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        """Handle GET requests for webhook verification"""
        if self.path.startswith('/webhook/whatsapp'):
            self.handle_whatsapp_verification()
        else:
            self.send_error(404, "Endpoint not found")

    def do_POST(self):
        """Handle POST requests for AI services and webhooks"""
        if self.path == '/api/generate-response':
            self.handle_generate_response()
        elif self.path == '/api/analyze-emergency':
            self.handle_analyze_emergency()
        elif self.path == '/webhook/whatsapp':
            self.handle_whatsapp_webhook()
        else:
            self.send_error(404, "Endpoint not found")

    def handle_generate_response(self):
        """Generate AI response using GPT-4o"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # Support des deux formats : messages ou message direct
            messages = data.get('messages', [])
            single_message = data.get('message', '')
            custom_instructions = data.get('customInstructions', '')
            
            # Si pas de messages mais un message direct, créer la structure
            if not messages and single_message:
                messages = [{'direction': 'inbound', 'content': single_message}]
            
            if not messages:
                self.send_json_response({'response': 'Bonjour ! Comment puis-je vous aider ?'})
                return
            
            # Construire l'historique de conversation
            conversation_history = []
            for msg in messages:
                role = 'user' if msg.get('direction') == 'inbound' else 'assistant'
                conversation_history.append({
                    'role': role,
                    'content': msg.get('content', '')
                })
            
            # Prompt système pour GPT-4o
            system_prompt = f"""Tu es un assistant virtuel pour un logement Airbnb. Réponds aux questions des invités de manière personnalisée et chaleureuse.

Instructions spécifiques pour ce logement :
{custom_instructions}

Règles importantes :
- Réponds uniquement en français
- Sois chaleureux et professionnel
- Utilise les informations spécifiques du logement si disponibles
- Si tu n'as pas l'information, propose de contacter l'hôte directement
- Reste dans le contexte Airbnb/location saisonnière"""

            # Appel à GPT-4o
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",  # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
                messages=[
                    {"role": "system", "content": system_prompt}
                ] + conversation_history,
                max_tokens=500,
                temperature=0.7
            )
            
            ai_response = response.choices[0].message.content
            self.send_json_response({'response': ai_response})
            
        except Exception as e:
            print(f"Erreur génération réponse: {e}")
            self.send_json_response({'error': 'Erreur lors de la génération de la réponse'}, 500)

    def handle_analyze_emergency(self):
        """Analyze emergency using GPT-4o"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # Nouveau format : prompt et message directs
            prompt = data.get('prompt', '')
            message = data.get('message', '')
            analysis_type = data.get('type', 'analysis')
            
            if not message:
                if analysis_type == 'analysis':
                    self.send_json_response({
                        'analysis': json.dumps({
                            'needsAttention': False,
                            'conversationTag': None,
                            'confidence': 1.0,
                            'explanation': 'Aucun message à analyser',
                            'recommendedAction': 'Aucune action nécessaire'
                        })
                    })
                else:
                    self.send_json_response({
                        'response': 'Bonjour ! Comment puis-je vous aider ?'
                    })
                return
            
            print(f"[OpenAI Service] Analyse en cours: {message[:50]}...")
            
            # Utiliser GPT-4o pour l'analyse
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": message}
                ],
                max_tokens=200,
                temperature=0.7,
                response_format={"type": "json_object"} if analysis_type == 'analysis' else None
            )
            
            ai_response = response.choices[0].message.content
            print(f"[OpenAI Service] Réponse GPT-4o: {ai_response}")
            
            if analysis_type == 'analysis':
                self.send_json_response({'analysis': ai_response})
            else:
                self.send_json_response({'response': ai_response})
            
        except Exception as e:
            print(f"Erreur analyse urgence: {e}")
            # Fallback analysis
            if analysis_type == 'analysis':
                self.send_json_response({
                    'analysis': json.dumps({
                        'needsAttention': True,
                        'conversationTag': 'IA incertaine',
                        'confidence': 0.5,
                        'explanation': 'Impossible d\'analyser le message avec certitude',
                        'recommendedAction': 'Intervention manuelle requise'
                    })
                })
            else:
                self.send_json_response({
                    'response': 'Désolé, je ne peux pas répondre pour le moment. Votre hôte vous répondra bientôt.'
                })

    def send_json_response(self, data, status_code=200):
        """Send JSON response with CORS headers"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def handle_whatsapp_verification(self):
        """Handle WhatsApp webhook verification"""
        try:
            parsed_url = urlparse(self.path)
            query_params = parse_qs(parsed_url.query)
            
            mode = query_params.get('hub.mode', [None])[0]
            token = query_params.get('hub.verify_token', [None])[0]
            challenge = query_params.get('hub.challenge', [None])[0]
            
            print(f"Vérification webhook WhatsApp: mode={mode}, token={'présent' if token else 'absent'}")
            
            # Vérifier le token avec la variable d'environnement
            verify_token = os.environ.get('WHATSAPP_VERIFY_TOKEN', 'airhost_webhook_verify_2024')
            
            if mode == 'subscribe' and token == verify_token:
                print('Webhook WhatsApp vérifié avec succès')
                self.send_response(200)
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(challenge.encode('utf-8'))
            else:
                print('Échec de la vérification du webhook WhatsApp - token incorrect')
                self.send_error(403, "Forbidden")
                
        except Exception as e:
            print(f"Erreur lors de la vérification webhook: {e}")
            self.send_error(500, "Internal Server Error")

    def handle_whatsapp_webhook(self):
        """Handle incoming WhatsApp messages"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            print(f"Webhook WhatsApp reçu: {json.dumps(data, indent=2)}")
            
            # Vérifier si c'est un message WhatsApp
            if data.get('object') != 'whatsapp_business_account':
                self.send_json_response({'error': 'Invalid webhook event'}, 400)
                return
            
            # Extraire les informations du message
            entry = data.get('entry', [{}])[0]
            changes = entry.get('changes', [{}])[0]
            value = changes.get('value', {})
            
            if not value.get('messages'):
                print('Pas de messages dans le webhook')
                self.send_json_response({'message': 'No messages to process'})
                return
            
            # Pour chaque message, afficher les détails
            for message in value['messages']:
                print(f"Message reçu de {message.get('from')}: {message.get('text', {}).get('body', '[Message non textuel]')}")
            
            # Répondre avec succès
            self.send_json_response({'message': 'OK'})
            
        except Exception as e:
            print(f"Erreur lors du traitement du webhook: {e}")
            self.send_json_response({'error': str(e)}, 500)

    def log_message(self, format, *args):
        """Suppress default logging"""
        pass

def start_server(port=8080):
    """Start the OpenAI service server"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, OpenAIServiceHandler)
    print(f"Service OpenAI démarré sur le port {port}")
    httpd.serve_forever()

if __name__ == "__main__":
    if not os.environ.get('OPENAI_API_KEY'):
        print("ERREUR: Variable d'environnement OPENAI_API_KEY non définie")
        sys.exit(1)
    
    port = int(os.environ.get('OPENAI_SERVICE_PORT', 8080))
    start_server(port)