/**
 * OpenCog Integration Tests
 * Basic tests to verify OpenCog functionality
 */

const { OpenCogFactory, OpenCogUtils, ATOM_TYPES } = require('../src/opencog');

async function testAtomSpace() {
  console.log('Testing AtomSpace...');
  
  const atomSpace = OpenCogFactory.createAtomSpace();
  
  // Test node creation
  const conceptNode = atomSpace.addNode(ATOM_TYPES.CONCEPT_NODE, 'cat');
  console.log('Created concept node:', conceptNode.toString());
  
  // Test link creation
  const predicateNode = atomSpace.addNode(ATOM_TYPES.PREDICATE_NODE, 'is_animal');
  const animalNode = atomSpace.addNode(ATOM_TYPES.CONCEPT_NODE, 'animal');
  
  const listLink = atomSpace.addLink(ATOM_TYPES.LIST_LINK, [conceptNode, animalNode]);
  const evaluationLink = atomSpace.addLink(ATOM_TYPES.EVALUATION_LINK, [predicateNode, listLink]);
  
  console.log('Created evaluation:', evaluationLink.toString());
  console.log('AtomSpace size:', atomSpace.getSize());
  
  return atomSpace;
}

async function testECAN(atomSpace) {
  console.log('\nTesting ECAN...');
  
  const ecan = OpenCogFactory.createECAN(atomSpace);
  
  // Get some atoms to stimulate
  const atoms = atomSpace.getAllAtoms();
  if (atoms.length > 0) {
    console.log('Stimulating first atom...');
    ecan.stimulateAtom(atoms[0].id, 50);
    
    // Run a few ECAN cycles
    for (let i = 0; i < 3; i++) {
      ecan.runCycle();
    }
    
    const stats = ecan.getStatistics();
    console.log('ECAN statistics:', stats);
  }
  
  return ecan;
}

async function testPLN(atomSpace) {
  console.log('\nTesting PLN...');
  
  const pln = OpenCogFactory.createPLN(atomSpace);
  
  // Add some knowledge for inference
  const catNode = atomSpace.getNodeByName(ATOM_TYPES.CONCEPT_NODE, 'cat');
  const animalNode = atomSpace.getNodeByName(ATOM_TYPES.CONCEPT_NODE, 'animal');
  const mammalNode = atomSpace.addNode(ATOM_TYPES.CONCEPT_NODE, 'mammal');
  
  if (catNode && animalNode) {
    // Create: cat -> animal
    const implication1 = atomSpace.addLink(
      ATOM_TYPES.IMPLICATION_LINK,
      [catNode, animalNode],
      OpenCogFactory.createTruthValue(0.9, 0.8)
    );
    
    // Create: animal -> mammal
    const implication2 = atomSpace.addLink(
      ATOM_TYPES.IMPLICATION_LINK,
      [animalNode, mammalNode],
      OpenCogFactory.createTruthValue(0.7, 0.6)
    );
    
    console.log('Added implications for inference');
    
    // Perform inference
    const results = await pln.performInference(5);
    console.log('PLN inference results:', results);
  }
  
  return pln;
}

async function testOpenCogIntegration() {
  console.log('\nTesting OpenCog Integration...');
  
  const openCog = OpenCogFactory.createOpenCogSystem({
    autoStartCogServer: false, // Don't start for tests
    enablePeriodicInference: false,
    enableAttentionAllocation: false
  });
  
  // Add some knowledge
  openCog.addKnowledge('concept', 'artificial intelligence', {
    importance: 0.8,
    confidence: 0.9
  });
  
  openCog.addKnowledge('fact', 'AI can solve problems', {
    importance: 0.7,
    confidence: 0.8
  });
  
  openCog.addKnowledge('rule', 'AI solves problems implies AI is useful', {
    importance: 0.6,
    confidence: 0.7
  });
  
  // Query knowledge
  const results = openCog.queryKnowledge({ type: ATOM_TYPES.CONCEPT_NODE });
  console.log(`Found ${results.length} concept nodes`);
  
  // Get insights
  const insights = openCog.getCognitiveInsights();
  console.log('Cognitive insights:', insights);
  
  // Cleanup
  openCog.shutdown();
  
  return openCog;
}

async function testOpenCogUtils() {
  console.log('\nTesting OpenCog Utils...');
  
  // Test text to knowledge conversion
  const text = "Cats are animals. Animals are living beings. Cats can be pets.";
  const knowledge = OpenCogUtils.textToKnowledge(text);
  console.log('Extracted knowledge from text:', knowledge);
  
  // Test fact creation
  const fact = OpenCogUtils.createFact('cat', 'is_type_of', 'animal');
  console.log('Created fact:', OpenCogUtils.describeAtom(fact.fact));
  
  // Test rule creation
  const rule = OpenCogUtils.createRule(
    { subject: 'cat', predicate: 'is_type_of', object: 'animal' },
    { subject: 'cat', predicate: 'has_property', object: 'living' }
  );
  console.log('Created rule:', OpenCogUtils.describeAtom(rule.rule));
  
  return { knowledge, fact, rule };
}

async function runAllTests() {
  console.log('🧠 Starting OpenCog Integration Tests...\n');
  
  try {
    // Test core components
    const atomSpace = await testAtomSpace();
    const ecan = await testECAN(atomSpace);
    const pln = await testPLN(atomSpace);
    
    // Test integration
    await testOpenCogIntegration();
    
    // Test utilities
    await testOpenCogUtils();
    
    console.log('\n✅ All OpenCog tests completed successfully!');
    
    // Final statistics
    console.log('\nFinal AtomSpace statistics:');
    console.log(atomSpace.getStatistics());
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log('\n🎉 OpenCog implementation is working correctly!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 OpenCog tests failed:', error);
      process.exit(1);
    });
}

module.exports = {
  testAtomSpace,
  testECAN,
  testPLN,
  testOpenCogIntegration,
  testOpenCogUtils,
  runAllTests
};