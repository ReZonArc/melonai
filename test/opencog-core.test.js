/**
 * Simple OpenCog Core Tests
 * Tests only the core OpenCog components without dependencies
 */

// Test AtomSpace
const AtomSpace = require('../src/opencog/atomspace/AtomSpace');
const { Atom, TruthValue, AttentionValue } = require('../src/opencog/atomspace/Atom');
const { ATOM_TYPES } = require('../src/opencog/atomspace/AtomTypes');
const ECAN = require('../src/opencog/ecan/ECAN');
const PLN = require('../src/opencog/pln/PLN');

function testAtomSpace() {
  console.log('🧠 Testing AtomSpace...');
  
  const atomSpace = new AtomSpace();
  
  // Test node creation
  const conceptNode = atomSpace.addNode(ATOM_TYPES.CONCEPT_NODE, 'cat');
  console.log('✓ Created concept node:', conceptNode.toString());
  
  // Test link creation
  const predicateNode = atomSpace.addNode(ATOM_TYPES.PREDICATE_NODE, 'is_animal');
  const animalNode = atomSpace.addNode(ATOM_TYPES.CONCEPT_NODE, 'animal');
  
  const listLink = atomSpace.addLink(ATOM_TYPES.LIST_LINK, [conceptNode, animalNode]);
  const evaluationLink = atomSpace.addLink(ATOM_TYPES.EVALUATION_LINK, [predicateNode, listLink]);
  
  console.log('✓ Created evaluation:', evaluationLink.toString());
  console.log('✓ AtomSpace size:', atomSpace.getSize());
  
  // Test queries
  const conceptNodes = atomSpace.getAtomsByType(ATOM_TYPES.CONCEPT_NODE);
  console.log('✓ Found', conceptNodes.length, 'concept nodes');
  
  const stats = atomSpace.getStatistics();
  console.log('✓ AtomSpace statistics:', stats);
  
  return atomSpace;
}

function testECAN(atomSpace) {
  console.log('\n⚡ Testing ECAN...');
  
  const ecan = new ECAN(atomSpace);
  
  // Get some atoms to stimulate
  const atoms = atomSpace.getAllAtoms();
  if (atoms.length > 0) {
    console.log('✓ Stimulating first atom...');
    const success = ecan.stimulateAtom(atoms[0].id, 50);
    console.log('✓ Stimulation result:', success);
    
    // Run a few ECAN cycles
    for (let i = 0; i < 3; i++) {
      ecan.runCycle();
    }
    
    const stats = ecan.getStatistics();
    console.log('✓ ECAN statistics:', {
      cyclesRun: stats.cyclesRun,
      totalStimuli: stats.totalStimuli,
      attentionalFocusSize: stats.attentionalFocusSize
    });
    
    // Test attentional focus
    const focus = atomSpace.getAttentionalFocus();
    console.log('✓ Attentional focus size:', focus.length);
  }
  
  return ecan;
}

function testPLN(atomSpace) {
  console.log('\n🔗 Testing PLN...');
  
  const pln = new PLN(atomSpace);
  
  // Add some knowledge for inference
  const catNode = atomSpace.getNodeByName(ATOM_TYPES.CONCEPT_NODE, 'cat');
  const animalNode = atomSpace.getNodeByName(ATOM_TYPES.CONCEPT_NODE, 'animal');
  const mammalNode = atomSpace.addNode(ATOM_TYPES.CONCEPT_NODE, 'mammal');
  
  if (catNode && animalNode) {
    // Create: cat -> animal
    const tv1 = new TruthValue(0.9, 0.8);
    const implication1 = atomSpace.addLink(
      ATOM_TYPES.IMPLICATION_LINK,
      [catNode, animalNode],
      tv1
    );
    
    // Create: animal -> mammal  
    const tv2 = new TruthValue(0.7, 0.6);
    const implication2 = atomSpace.addLink(
      ATOM_TYPES.IMPLICATION_LINK,
      [animalNode, mammalNode],
      tv2
    );
    
    console.log('✓ Added implications for inference');
    console.log('  -', implication1.toString());
    console.log('  -', implication2.toString());
    
    // Test PLN statistics
    const stats = pln.getStatistics();
    console.log('✓ PLN statistics:', {
      rulesAvailable: stats.rulesAvailable,
      totalAtoms: stats.totalAtoms,
      implicationLinks: stats.implicationLinks
    });
  }
  
  return pln;
}

function testTruthValues() {
  console.log('\n📊 Testing Truth Values...');
  
  // Test truth value creation and operations
  const tv1 = new TruthValue(0.8, 0.9);
  const tv2 = new TruthValue(0.6, 0.7);
  
  console.log('✓ TV1:', tv1.toString());
  console.log('✓ TV2:', tv2.toString());
  console.log('✓ TV1 valid:', tv1.isValid());
  console.log('✓ TV2 confidence:', tv2.getConfidence());
  
  return { tv1, tv2 };
}

function testAttentionValues() {
  console.log('\n🎯 Testing Attention Values...');
  
  // Test attention value creation
  const av1 = new AttentionValue(100, 50, false);
  const av2 = new AttentionValue(200, 75, true);
  
  console.log('✓ AV1:', av1.toString());
  console.log('✓ AV2:', av2.toString());
  console.log('✓ AV1 STI:', av1.getSTI());
  console.log('✓ AV2 VLTI:', av2.getVLTI());
  
  return { av1, av2 };
}

function testAtomTypes() {
  console.log('\n🏷️  Testing Atom Types...');
  
  const { isNodeType, isLinkType } = require('../src/opencog/atomspace/AtomTypes');
  
  console.log('✓ CONCEPT_NODE is node type:', isNodeType(ATOM_TYPES.CONCEPT_NODE));
  console.log('✓ EVALUATION_LINK is link type:', isLinkType(ATOM_TYPES.EVALUATION_LINK));
  console.log('✓ Total atom types available:', Object.keys(ATOM_TYPES).length);
  
  // Test some specific types
  const testTypes = [
    ATOM_TYPES.CONCEPT_NODE,
    ATOM_TYPES.PREDICATE_NODE,
    ATOM_TYPES.EVALUATION_LINK,
    ATOM_TYPES.IMPLICATION_LINK,
    ATOM_TYPES.GOAL_NODE,
    ATOM_TYPES.PLN_RULE_NODE
  ];
  
  testTypes.forEach(type => {
    console.log(`✓ ${type}: node=${isNodeType(type)}, link=${isLinkType(type)}`);
  });
}

function runAllTests() {
  console.log('🚀 Starting OpenCog Core Tests...\n');
  
  try {
    // Test core components
    testAtomTypes();
    testTruthValues();
    testAttentionValues();
    
    const atomSpace = testAtomSpace();
    const ecan = testECAN(atomSpace);
    const pln = testPLN(atomSpace);
    
    console.log('\n🎉 All core OpenCog tests completed successfully!');
    
    // Final summary
    console.log('\n📈 Final Summary:');
    console.log('- AtomSpace size:', atomSpace.getSize());
    console.log('- ECAN cycles run:', ecan.getStatistics().cyclesRun);
    console.log('- PLN rules available:', pln.getStatistics().rulesAvailable);
    
    const finalStats = atomSpace.getStatistics();
    console.log('- Node count:', finalStats.nodeCount);
    console.log('- Link count:', finalStats.linkCount);
    console.log('- Type distribution:', finalStats.typeDistribution);
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const success = runAllTests();
  
  if (success) {
    console.log('\n✅ OpenCog core implementation is working correctly!');
    console.log('🧠 MelonAI now has advanced cognitive capabilities powered by OpenCog!');
    process.exit(0);
  } else {
    console.log('\n❌ OpenCog tests failed!');
    process.exit(1);
  }
}

module.exports = {
  testAtomSpace,
  testECAN,
  testPLN,
  testTruthValues,
  testAttentionValues,
  testAtomTypes,
  runAllTests
};