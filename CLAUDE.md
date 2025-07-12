# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server on port 5000 (Vite)
- `npm run build` - Build TypeScript and create production bundle
- `npm run build-no-types` - Build without TypeScript checking (faster)
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Supabase Development
- `supabase start` - Start local Supabase instance (ports 54321-54329)
- `supabase stop` - Stop local Supabase instance
- `supabase db reset` - Reset local database with migrations and seeds

### Deployment
- `npm run build && netlify deploy` - Deploy to Netlify staging
- `npm run build && netlify deploy --prod` - Deploy to production

## Architecture Overview

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Material-UI (MUI) + Emotion
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **Deployment**: Netlify (frontend) + Supabase (backend services)
- **AI**: OpenAI GPT-4o integration for conversation analysis and response generation

### Core Application Structure

This is an **Airbnb host management platform** focused on **WhatsApp communication automation** and **emergency conversation analysis**.

#### Main Features
1. **Conversation Management**: Real-time WhatsApp conversations between hosts and guests
2. **AI-Powered Analysis**: GPT-4o analyzes conversations for urgency, sentiment, and escalation detection
3. **Emergency Detection**: Automatic classification of conversations requiring host intervention
4. **Template System**: Automated WhatsApp template sending (welcome messages, responses)
5. **Property Management**: Link conversations to specific Airbnb properties
6. **Multi-tenant**: Support for multiple hosts with isolated data

#### Key Directories
- `src/pages/` - Main application pages (Chat, Properties, Settings, Debug, EmergencyCases)
- `src/components/` - Reusable UI components organized by feature
- `src/services/` - Business logic for AI, notifications, WhatsApp, conversations
- `src/lib/` - Core infrastructure (Supabase client, Firebase, auth)
- `src/types/` - TypeScript definitions
- `supabase/functions/` - Edge Functions for server-side operations
- `netlify/functions/` - Legacy Netlify Functions (being migrated to Supabase)

#### Database Schema (Supabase)
- `conversations` - Main conversation records with guest/host relationships
- `messages` - Individual WhatsApp messages with AI analysis
- `properties` - Airbnb property configurations
- `whatsapp_config` - WhatsApp API credentials per host
- `whatsapp_template_config` - Template automation settings
- `conversation_analysis` - AI analysis results and emergency classifications

### AI Integration Architecture

The app uses **OpenAI GPT-4o** for:
- **Conversation Analysis**: Detecting urgency levels, customer satisfaction, behavioral escalation
- **Response Generation**: Creating contextual responses for hosts
- **Emergency Classification**: 6 categories (Critical Emergency, Unsatisfied Customer, Behavioral Escalation, AI Uncertain, Host Intervention Required, Known Response)

AI services are abstracted in `src/services/emergency-api.ts` with fallback keyword analysis.

### Authentication & Security
- Supabase Auth with email/password
- Row Level Security (RLS) policies enforce data isolation between hosts
- Service role keys for server-side operations
- Environment-based configuration switching (dev/staging/production)

### Real-time Features
- Live conversation updates via Supabase Realtime
- Push notifications for urgent conversations
- Automatic message synchronization from WhatsApp webhook

### WhatsApp Integration
- Meta WhatsApp Business API integration
- Webhook handling for incoming messages
- Template message automation
- Phone number normalization and validation

## Development Practices

### Environment Configuration
- Uses Vite environment variables (`VITE_*`)
- Dynamic Supabase client configuration based on environment
- Separate configurations for development, staging, and production databases

### Code Organization
- Service layer pattern for business logic
- Custom hooks for data fetching and state management
- Type-safe API interfaces with TypeScript
- Component composition with Material-UI

### Testing & Debugging
- No formal test framework configured (manual testing via Debug page)
- Extensive console logging for troubleshooting
- Test utilities in root directory (`test-*.js` scripts)
- Debug page at `/debug` for real-time system status

### State Management
- React hooks for local state
- Supabase Realtime for server state synchronization
- Context providers for authentication state
- Local storage for user preferences

## Important Files

### Core Configuration
- `vite.config.ts` - Vite configuration with custom ports
- `supabase/config.toml` - Supabase local development configuration
- `netlify.toml` - Netlify deployment and function configuration
- `eslint.config.js` - ESLint rules for TypeScript/React

### Key Service Files
- `src/lib/supabase.ts` - Supabase client setup with environment detection
- `src/services/emergency-api.ts` - AI conversation analysis service
- `src/services/notification/` - Push notification system
- `src/hooks/useAuth.ts` - Authentication state management

### Edge Functions
- `supabase/functions/create-conversation-with-welcome/` - Creates conversations and sends welcome templates
- Legacy Netlify functions in `netlify/functions/` (being phased out)

## Deployment & Migration Notes

The project has extensive documentation for production deployment and database migration in the root directory. Key migration files handle schema updates and data synchronization between environments.

The application uses environment-specific Supabase projects and has automated scripts for switching between development, staging, and production configurations.