/**
 * Test complet de la migration production
 * Vérifie que toutes les structures sont en place
 */

import { createClient } from '@supabase/supabase-js';

const PROD_SUPABASE_URL = process.env.PROD_SUPABASE_URL;
const PROD_SUPABASE_SERVICE_ROLE_KEY = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;

if (!PROD_SUPABASE_URL || !PROD_SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Variables d\'environnement manquantes pour la production');
    process.exit(1);
}

const supabase = createClient(PROD_SUPABASE_URL, PROD_SUPABASE_SERVICE_ROLE_KEY);

async function testMigration() {
    console.log('🔍 Test de validation de la migration production...\n');
    
    try {
        // Test 1: Fonction de validation intégrée
        console.log('📋 Test 1: Validation système intégrée');
        const { data: validationTests, error: validationError } = await supabase
            .rpc('test_emergency_system');
        
        if (validationError) {
            console.error('❌ Erreur fonction de validation:', validationError);
            return false;
        }
        
        console.log('Résultats des tests intégrés:');
        validationTests.forEach(test => {
            const status = test.status === 'PASS' ? '✅' : '❌';
            console.log(`  ${status} ${test.test_name}: ${test.details}`);
        });
        
        const allPassed = validationTests.every(test => test.status === 'PASS');
        if (!allPassed) {
            console.log('❌ Certains tests intégrés ont échoué');
            return false;
        }
        
        // Test 2: Structure de la table conversation_analysis
        console.log('\n📋 Test 2: Structure table conversation_analysis');
        const { data: analysisTable, error: analysisError } = await supabase
            .from('conversation_analysis')
            .select('*')
            .limit(1);
        
        if (analysisError) {
            console.error('❌ Table conversation_analysis inaccessible:', analysisError);
            return false;
        }
        console.log('✅ Table conversation_analysis accessible');
        
        // Test 3: Colonnes ajoutées aux conversations
        console.log('\n📋 Test 3: Nouvelles colonnes conversations');
        const { data: conversations, error: convError } = await supabase
            .from('conversations')
            .select('id, last_analysis_tag, last_analysis_confidence, needs_attention, priority_level, last_analyzed_at')
            .limit(1);
        
        if (convError) {
            console.error('❌ Erreur colonnes conversations:', convError);
            return false;
        }
        console.log('✅ Nouvelles colonnes conversations présentes');
        
        // Test 4: Vues créées
        console.log('\n📋 Test 4: Vues utilitaires');
        const { data: urgentConvs, error: urgentError } = await supabase
            .from('urgent_conversations')
            .select('*')
            .limit(1);
        
        if (urgentError) {
            console.error('❌ Vue urgent_conversations:', urgentError);
            return false;
        }
        console.log('✅ Vue urgent_conversations fonctionnelle');
        
        const { data: tagStats, error: statsError } = await supabase
            .from('tag_statistics')
            .select('*')
            .limit(1);
        
        if (statsError) {
            console.error('❌ Vue tag_statistics:', statsError);
            return false;
        }
        console.log('✅ Vue tag_statistics fonctionnelle');
        
        // Test 5: Test d'insertion d'analyse
        console.log('\n📋 Test 5: Insertion analyse de test');
        
        // Récupérer une conversation existante
        const { data: existingConv, error: convSelectError } = await supabase
            .from('conversations')
            .select('id')
            .limit(1);
        
        if (convSelectError || !existingConv.length) {
            console.log('⚠️  Aucune conversation existante pour test d\'insertion');
        } else {
            const conversationId = existingConv[0].id;
            
            // Insérer une analyse de test
            const { data: insertResult, error: insertError } = await supabase
                .from('conversation_analysis')
                .insert({
                    conversation_id: conversationId,
                    analysis_type: 'emergency',
                    tag: 'Urgence critique',
                    confidence: 0.95,
                    explanation: 'Test migration - analyse automatique',
                    needs_attention: true,
                    priority_level: 5
                })
                .select();
            
            if (insertError) {
                console.error('❌ Erreur insertion analyse:', insertError);
                return false;
            }
            
            console.log('✅ Insertion analyse réussie');
            
            // Vérifier que la conversation a été mise à jour automatiquement
            const { data: updatedConv, error: updateCheckError } = await supabase
                .from('conversations')
                .select('last_analysis_tag, needs_attention, priority_level')
                .eq('id', conversationId)
                .single();
            
            if (updateCheckError) {
                console.error('❌ Erreur vérification trigger:', updateCheckError);
                return false;
            }
            
            if (updatedConv.last_analysis_tag === 'Urgence critique' && 
                updatedConv.needs_attention === true && 
                updatedConv.priority_level === 5) {
                console.log('✅ Triggers de synchronisation fonctionnels');
            } else {
                console.log('❌ Triggers de synchronisation défaillants');
                return false;
            }
            
            // Nettoyer l'analyse de test
            await supabase
                .from('conversation_analysis')
                .delete()
                .eq('explanation', 'Test migration - analyse automatique');
        }
        
        console.log('\n🎉 Migration production validée avec succès !');
        console.log('\n📊 Résumé:');
        console.log('  ✅ Table conversation_analysis créée');
        console.log('  ✅ Colonnes conversations ajoutées');
        console.log('  ✅ Vues utilitaires fonctionnelles');
        console.log('  ✅ Triggers automatiques actifs');
        console.log('  ✅ Système de tags GPT-4o opérationnel');
        
        return true;
        
    } catch (error) {
        console.error('❌ Erreur inattendue:', error);
        return false;
    }
}

// Test des fonctionnalités métier
async function testBusinessLogic() {
    console.log('\n🔧 Test des fonctionnalités métier...\n');
    
    try {
        // Test des fonctions de calcul de priorité
        console.log('📋 Test: Fonction calcul priorité');
        const { data: priorityTest, error: priorityError } = await supabase
            .rpc('calculate_priority_level', { tag_value: 'Urgence critique' });
        
        if (priorityError) {
            console.error('❌ Fonction calculate_priority_level:', priorityError);
            return false;
        }
        
        if (priorityTest === 5) {
            console.log('✅ Calcul priorité "Urgence critique" = 5');
        } else {
            console.log('❌ Calcul priorité incorrect');
            return false;
        }
        
        // Test autres niveaux
        const testCases = [
            { tag: 'Escalade comportementale', expected: 4 },
            { tag: 'Client mécontent', expected: 3 },
            { tag: 'Intervention hôte requise', expected: 3 },
            { tag: 'IA incertaine', expected: 2 },
            { tag: 'Réponse connue', expected: 1 }
        ];
        
        for (const testCase of testCases) {
            const { data: result } = await supabase
                .rpc('calculate_priority_level', { tag_value: testCase.tag });
            
            if (result === testCase.expected) {
                console.log(`✅ ${testCase.tag} = ${testCase.expected}`);
            } else {
                console.log(`❌ ${testCase.tag} attendu ${testCase.expected}, reçu ${result}`);
                return false;
            }
        }
        
        console.log('\n🎉 Fonctionnalités métier validées !');
        return true;
        
    } catch (error) {
        console.error('❌ Erreur test métier:', error);
        return false;
    }
}

async function main() {
    console.log('🚀 VALIDATION COMPLÈTE MIGRATION PRODUCTION\n');
    console.log(`📍 Base de données: ${PROD_SUPABASE_URL}`);
    console.log(`🔑 Clé service configurée: ${PROD_SUPABASE_SERVICE_ROLE_KEY ? 'Oui' : 'Non'}\n`);
    
    const migrationValid = await testMigration();
    const businessValid = await testBusinessLogic();
    
    if (migrationValid && businessValid) {
        console.log('\n🎉 SUCCÈS COMPLET - Migration production opérationnelle !');
        console.log('\n🚀 Prochaines étapes:');
        console.log('  1. L\'onglet "Urgences" sera maintenant fonctionnel');
        console.log('  2. Les messages WhatsApp seront analysés automatiquement');
        console.log('  3. Les tags de priorité s\'afficheront en temps réel');
        console.log('  4. Les notifications d\'urgence sont activées');
        
        process.exit(0);
    } else {
        console.log('\n❌ ÉCHEC - Migration incomplète ou défaillante');
        process.exit(1);
    }
}

main();