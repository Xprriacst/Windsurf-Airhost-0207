export interface WhatsAppConfig {
  id: string;
  host_id: string;
  phone_number_id: string;
  access_token: string;
  business_account_id: string;
  webhook_verify_token: string;
  is_active: boolean;
  send_welcome_message: boolean;
  welcome_template: string;
  available_templates: WhatsAppTemplate[];
  created_at: string;
  updated_at: string;
}

export interface WhatsAppTemplate {
  name: string;
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
  components: TemplateComponent[];
}

export interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
  };
  buttons?: TemplateButton[];
}

export interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  phone_number?: string;
}

export interface CreateConversationParams {
  host_id: string;
  guest_name: string;
  guest_phone: string;
  guest_email?: string;
  property_id: string;
  check_in_date: string;
  check_out_date: string;
  booking_reference?: string;
  platform?: string;
  send_welcome_message?: boolean;
  welcome_template?: string;
}