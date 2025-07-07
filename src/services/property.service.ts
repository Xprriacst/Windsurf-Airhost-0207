import { supabase } from '../lib/supabase';
import { Property } from '../types/property';
import { waitForConnectivity, isOnline } from '../utils/connectivity';

export async function fetchProperties(): Promise<Property[]> {
  try {
    console.log('Service: Récupération des propriétés avec timestamp anti-cache:', new Date().getTime());
    
    // Vérifier la connectivité avant toute requête
    if (!isOnline()) {
      console.warn('Appareil hors ligne détecté');
      throw new Error('Aucune connexion internet. Vérifiez votre connexion.');
    }
    
    // Attendre une connectivité stable pour mobile (timeout réduit)
    const hasConnectivity = await waitForConnectivity(2);
    if (!hasConnectivity) {
      console.warn('Connexion instable détectée, tentative quand même...');
      // Ne pas bloquer complètement, juste avertir
    }
    
    // Vérifier d'abord la session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log('Session status:', sessionData.session ? 'active' : 'none');
    
    if (sessionError) {
      console.error('Erreur de session:', sessionError);
      throw new Error('Problème de session utilisateur');
    }
    
    if (!sessionData.session) {
      throw new Error('Aucune session active');
    }

    const user = sessionData.session.user;
    console.log('User ID:', user.id);

    // Ajout d'un paramètre de timestamp pour contourner tout cache potentiel
    const timestamp = new Date().getTime();
    
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('host_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error(`Erreur lors de la récupération des propriétés (${timestamp}):`, error);
      // Fournir plus de contexte sur l'erreur
      if (error.code === 'PGRST116') {
        throw new Error('Table properties non trouvée. Veuillez contacter le support.');
      } else if (error.code === '42P01') {
        throw new Error('Problème de base de données. Veuillez réessayer.');
      } else if (error.message?.includes('Failed to fetch')) {
        throw new Error('Erreur de connexion. Vérifiez votre réseau.');
      } else {
        throw new Error(`Erreur de chargement: ${error.message}`);
      }
    }

    console.log(`Service: ${data?.length || 0} propriétés récupérées au timestamp ${timestamp}`);
    return data || [];
    
  } catch (error: any) {
    console.error('Erreur complète fetchProperties:', error);
    // Re-throw avec un message plus clair
    throw new Error(error.message || 'Impossible de charger les propriétés');
  }
}

export async function fetchPropertyById(id: string): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Erreur lors de la récupération de la propriété ${id}:`, error);
    throw error;
  }

  return data;
}

export async function updateProperty(property: Property): Promise<Property> {
  try {
    // Log pour voir quelles propriétés sont disponibles
    console.log('Propriété à mettre à jour:', { ...property });
    
    // Créer un objet updateData dynamiquement pour éviter les erreurs de colonnes manquantes
    // Force l'ajout d'un timestamp unique à chaque mise à jour
    const timestamp = new Date().toISOString();
    const updateData: Record<string, any> = {
      name: property.name,
      address: property.address,
      ai_instructions: property.ai_instructions,
      updated_at: timestamp
    };
    
    // Ajouter les champs optionnels uniquement s'ils existent dans la propriété
    if (property.amenities !== undefined) updateData.amenities = property.amenities;
    if (property.rules !== undefined) updateData.rules = property.rules;
    if (property.faq !== undefined) updateData.faq = property.faq;
    
    console.log(`Mise à jour à ${timestamp} - Données envoyées:`, updateData);
    console.log('ID de la propriété:', property.id);
    console.log('ID de l\'hôte:', property.host_id);
    
    // Ajout d'un paramètre aléatoire pour éviter tout problème de mise en cache
    console.log(`Timestamp de mise à jour pour éviter le cache: ${timestamp}`);
    
    const { data, error } = await supabase
      .from('properties')
      .update(updateData)
      .eq('id', property.id)
      .eq('host_id', property.host_id) // Sécurité supplémentaire
      .select('*')
      .single();
    
    // Logs pour vérifier la réponse de Supabase
    if (data) {
      console.log(`Mise à jour réussie à ${timestamp}, données retournées:`, data);
      
      // Vérification immédiate que les données ont bien été enregistrées
      const verifyUpdate = await supabase
        .from('properties')
        .select('*')
        .eq('id', property.id)
        .single();
        
      console.log('Vérification après mise à jour:', verifyUpdate.data);
      
      if (verifyUpdate.data?.ai_instructions !== property.ai_instructions) {
        console.error('ALERTE: La vérification montre que les données ne sont pas persistées correctement!');
      } else {
        console.log('Vérification OK: Les données sont correctement persistées dans la base');
      }
    } else {
      console.log('Aucune donnée retournée après la mise à jour');
    }
    
    // Vérifier si les instructions AI ont été correctement mises à jour
    if (data && data.ai_instructions !== property.ai_instructions) {
      console.warn('Les instructions AI retournées ne correspondent pas à celles envoyées!', {
        envoyé: property.ai_instructions,
        retourné: data.ai_instructions
      });
    }

    if (error) {
      console.error(`Erreur lors de la mise à jour de la propriété ${property.id}:`, error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`Erreur générale lors de la mise à jour de la propriété ${property.id}:`, error);
    throw error;
  }
}

export async function createProperty(property: Omit<Property, 'id' | 'created_at' | 'updated_at'>): Promise<Property> {
  const user = await supabase.auth.getUser();
  if (!user.data.user) {
    throw new Error('Utilisateur non authentifié');
  }

  const newProperty = {
    ...property,
    host_id: user.data.user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Debug log : payload envoyé
  console.log('Payload envoyé à Supabase:', newProperty);
  const { data, error } = await supabase
    .from('properties')
    .insert([newProperty])
    .select()
    .single();

  if (error) {
    // Debug log : message d'erreur détaillé
    console.error('Erreur Supabase lors de la création de la propriété:', error);
    console.log('Payload envoyé (reprise):', newProperty);
    throw error;
  }

  return data;
}

export async function deleteProperty(id: string): Promise<void> {
  const user = await supabase.auth.getUser();
  if (!user.data.user) {
    throw new Error('Utilisateur non authentifié');
  }

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id)
    .eq('host_id', user.data.user.id); // Sécurité supplémentaire

  if (error) {
    console.error(`Erreur lors de la suppression de la propriété ${id}:`, error);
    throw error;
  }
}
