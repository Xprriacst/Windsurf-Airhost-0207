/**
 * Vérification de la structure de la base de données production
 * Pour comprendre l'organisation utilisateur/hôte/propriété
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_PROD_SUPABASE_URL;
const serviceKey = process.env.VITE_PROD_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function checkDatabaseStructure() {
  console.log('Vérification de la structure de la base de données...');
  
  try {
    // 1. Lister toutes les tables publiques
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (tablesError) throw tablesError;
    
    console.log('\nTables disponibles:');
    tables?.forEach(table => console.log(`  - ${table.table_name}`));
    
    // 2. Vérifier la structure de la table properties
    const { data: propertiesStructure, error: propError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'properties')
      .order('ordinal_position');
    
    if (propError) throw propError;
    
    console.log('\nStructure table properties:');
    propertiesStructure?.forEach(col => 
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`)
    );
    
    // 3. Vérifier la structure de conversations
    const { data: convStructure, error: convError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'conversations')
      .order('ordinal_position');
    
    if (convError) throw convError;
    
    console.log('\nStructure table conversations:');
    convStructure?.forEach(col => 
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`)
    );
    
    // 4. Vérifier les contraintes de clé étrangère
    const { data: constraints, error: constError } = await supabase
      .from('information_schema.table_constraints')
      .select(`
        constraint_name,
        table_name,
        constraint_type
      `)
      .eq('table_schema', 'public')
      .eq('constraint_type', 'FOREIGN KEY');
    
    if (constError) throw constError;
    
    console.log('\nContraintes de clé étrangère:');
    constraints?.forEach(constraint => 
      console.log(`  - ${constraint.table_name}.${constraint.constraint_name}`)
    );
    
    // 5. Vérifier les données existantes dans properties
    const { data: existingProperties, error: existPropError } = await supabase
      .from('properties')
      .select('id, name, host_id')
      .limit(5);
    
    console.log('\nPropriétés existantes:');
    if (existingProperties && existingProperties.length > 0) {
      existingProperties.forEach(prop => 
        console.log(`  - ${prop.name} (host_id: ${prop.host_id})`)
      );
    } else {
      console.log('  Aucune propriété trouvée');
    }
    
    // 6. Vérifier les conversations sans property_id
    const { data: orphanConversations, error: orphanError } = await supabase
      .from('conversations')
      .select('id, guest_name, property_id')
      .is('property_id', null)
      .limit(3);
    
    if (orphanError) throw orphanError;
    
    console.log(`\nConversations sans property_id: ${orphanConversations?.length || 0}`);
    orphanConversations?.forEach(conv => 
      console.log(`  - ${conv.guest_name} (${conv.id})`)
    );
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

checkDatabaseStructure();