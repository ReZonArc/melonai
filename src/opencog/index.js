/**
 * OpenCog Module - Main entry point for OpenCog integration
 * Provides access to all OpenCog components and capabilities
 */

// Core OpenCog components
const AtomSpace = require('./atomspace/AtomSpace');
const { Atom, TruthValue, AttentionValue } = require('./atomspace/Atom');
const { ATOM_TYPES, NODE_TYPES, LINK_TYPES, OPENCOG_TYPES } = require('./atomspace/AtomTypes');

// Cognitive algorithms
const ECAN = require('./ecan/ECAN');
const PLN = require('./pln/PLN');
const CogServer = require('./cogserver/CogServer');

// Integration
const OpenCogIntegration = require('./OpenCogIntegration');

// Enhanced agent
const OpenCogAgent = require('../agent/opencog/OpenCogAgent');

/**
 * OpenCog Factory - Creates and configures OpenCog instances
 */
class OpenCogFactory {
  /**
   * Create a complete OpenCog system
   */
  static createOpenCogSystem(options = {}) {
    const integration = new OpenCogIntegration(options);
    return integration;
  }

  /**
   * Create an OpenCog-enhanced agent
   */
  static createOpenCogAgent(context = {}) {
    return new OpenCogAgent(context);
  }

  /**
   * Create a standalone AtomSpace
   */
  static createAtomSpace() {
    return new AtomSpace();
  }

  /**
   * Create ECAN system with AtomSpace
   */
  static createECAN(atomSpace, options = {}) {
    return new ECAN(atomSpace, options);
  }

  /**
   * Create PLN system with AtomSpace
   */
  static createPLN(atomSpace, options = {}) {
    return new PLN(atomSpace, options);
  }

  /**
   * Create CogServer with AtomSpace
   */
  static createCogServer(atomSpace, options = {}) {
    return new CogServer(atomSpace, options);
  }

  /**
   * Create a knowledge atom
   */
  static createAtom(type, name = null, outgoing = [], truthValue = null) {
    return new Atom(type, name, outgoing, truthValue);
  }

  /**
   * Create a truth value
   */
  static createTruthValue(strength = 0.5, confidence = 0.0) {
    return new TruthValue(strength, confidence);
  }

  /**
   * Create an attention value
   */
  static createAttentionValue(sti = 0, lti = 0, vlti = false) {
    return new AttentionValue(sti, lti, vlti);
  }
}

/**
 * OpenCog Utilities
 */
class OpenCogUtils {
  /**
   * Convert text to OpenCog knowledge representation
   */
  static textToKnowledge(text, options = {}) {
    const knowledge = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    
    sentences.forEach((sentence, index) => {
      const concepts = this.extractConcepts(sentence);
      concepts.forEach(concept => {
        knowledge.push({
          type: 'concept',
          content: concept,
          context: {
            sentence: sentence.trim(),
            position: index,
            confidence: options.confidence || 0.7
          }
        });
      });
    });

    return knowledge;
  }

  /**
   * Extract concepts from text
   */
  static extractConcepts(text) {
    // Simple concept extraction - can be enhanced with NLP
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));
    
    return [...new Set(words)]; // Remove duplicates
  }

  /**
   * Check if word is a stop word
   */
  static isStopWord(word) {
    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 
      'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
      'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy',
      'did', 'end', 'few', 'got', 'let', 'man', 'new', 'old', 'put', 'say',
      'she', 'too', 'use'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  /**
   * Validate atom structure
   */
  static validateAtom(atom) {
    if (!atom || !atom.type) {
      return { valid: false, error: 'Atom must have a type' };
    }

    if (!ATOM_TYPES[atom.type] && !Object.values(ATOM_TYPES).includes(atom.type)) {
      return { valid: false, error: `Invalid atom type: ${atom.type}` };
    }

    if (atom.isNode && atom.isNode() && atom.outgoing && atom.outgoing.length > 0) {
      return { valid: false, error: 'Node atoms cannot have outgoing links' };
    }

    if (atom.isLink && atom.isLink() && (!atom.outgoing || atom.outgoing.length === 0)) {
      return { valid: false, error: 'Link atoms must have outgoing atoms' };
    }

    return { valid: true };
  }

  /**
   * Create a simple fact representation
   */
  static createFact(subject, predicate, object, truthValue = null) {
    const atomSpace = new AtomSpace();
    
    const subjectNode = atomSpace.addNode(ATOM_TYPES.CONCEPT_NODE, subject);
    const predicateNode = atomSpace.addNode(ATOM_TYPES.PREDICATE_NODE, predicate);
    const objectNode = atomSpace.addNode(ATOM_TYPES.CONCEPT_NODE, object);

    const listLink = atomSpace.addLink(ATOM_TYPES.LIST_LINK, [subjectNode, objectNode]);
    const evaluationLink = atomSpace.addLink(
      ATOM_TYPES.EVALUATION_LINK, 
      [predicateNode, listLink],
      truthValue
    );

    return {
      atomSpace,
      fact: evaluationLink,
      components: { subject: subjectNode, predicate: predicateNode, object: objectNode }
    };
  }

  /**
   * Create a rule representation
   */
  static createRule(condition, conclusion, truthValue = null) {
    const atomSpace = new AtomSpace();
    
    // Parse condition and conclusion as facts
    const conditionFact = this.createFact(
      condition.subject, 
      condition.predicate, 
      condition.object
    );
    
    const conclusionFact = this.createFact(
      conclusion.subject,
      conclusion.predicate,
      conclusion.object
    );

    // Create implication link
    const implicationLink = atomSpace.addLink(
      ATOM_TYPES.IMPLICATION_LINK,
      [conditionFact.fact, conclusionFact.fact],
      truthValue
    );

    return {
      atomSpace,
      rule: implicationLink,
      condition: conditionFact.fact,
      conclusion: conclusionFact.fact
    };
  }

  /**
   * Generate human-readable description of atom
   */
  static describeAtom(atom) {
    if (!atom) return 'Invalid atom';

    if (atom.isNode && atom.isNode()) {
      return `${atom.type}: "${atom.name || 'unnamed'}"`;
    } else if (atom.isLink && atom.isLink()) {
      const outgoingDesc = atom.outgoing
        .map(outAtom => this.describeAtom(outAtom))
        .join(', ');
      return `${atom.type}(${outgoingDesc})`;
    }

    return `${atom.type}`;
  }

  /**
   * Calculate semantic similarity between two atoms
   */
  static calculateSimilarity(atom1, atom2) {
    if (!atom1 || !atom2) return 0;

    // Simple similarity based on type and name
    let similarity = 0;

    if (atom1.type === atom2.type) {
      similarity += 0.5;
    }

    if (atom1.name && atom2.name) {
      const name1 = atom1.name.toLowerCase();
      const name2 = atom2.name.toLowerCase();
      
      if (name1 === name2) {
        similarity += 0.5;
      } else {
        // Simple string similarity
        const maxLen = Math.max(name1.length, name2.length);
        const minLen = Math.min(name1.length, name2.length);
        similarity += (minLen / maxLen) * 0.3;
      }
    }

    return Math.min(1.0, similarity);
  }
}

/**
 * OpenCog Examples
 */
class OpenCogExamples {
  /**
   * Create a simple knowledge base example
   */
  static createSimpleKnowledgeBase() {
    const integration = OpenCogFactory.createOpenCogSystem();

    // Add some facts
    integration.addKnowledge('fact', 'cats are animals', { confidence: 0.9 });
    integration.addKnowledge('fact', 'animals are living beings', { confidence: 0.95 });
    integration.addKnowledge('concept', 'pet', { confidence: 0.8 });
    integration.addKnowledge('fact', 'cats can be pets', { confidence: 0.85 });

    // Add a rule
    integration.addKnowledge('rule', 'if X is animal and X can be pet then X is domestic', {
      confidence: 0.8
    });

    return integration;
  }

  /**
   * Demonstrate inference
   */
  static async demonstrateInference() {
    const kb = this.createSimpleKnowledgeBase();
    
    console.log('Performing inference...');
    const results = await kb.performInference({ maxIterations: 20 });
    
    console.log('Inference results:', results);
    console.log('Knowledge base statistics:', kb.getStatistics());
    
    return results;
  }

  /**
   * Demonstrate attention allocation
   */
  static demonstrateAttention() {
    const kb = this.createSimpleKnowledgeBase();
    
    // Stimulate some concepts
    const catAtoms = kb.queryKnowledge({ name: 'cats' });
    catAtoms.forEach(atom => {
      kb.ecan.stimulateAtom(atom.id, 50);
    });

    // Run attention cycles
    for (let i = 0; i < 5; i++) {
      kb.ecan.runCycle();
    }

    const attention = kb.ecan.getStatistics();
    console.log('Attention statistics:', attention);
    
    return attention;
  }
}

module.exports = {
  // Core classes
  AtomSpace,
  Atom,
  TruthValue,
  AttentionValue,
  ECAN,
  PLN,
  CogServer,
  OpenCogIntegration,
  OpenCogAgent,

  // Constants
  ATOM_TYPES,
  NODE_TYPES,
  LINK_TYPES,
  OPENCOG_TYPES,

  // Utilities
  OpenCogFactory,
  OpenCogUtils,
  OpenCogExamples,

  // Convenience exports
  createOpenCogSystem: OpenCogFactory.createOpenCogSystem,
  createOpenCogAgent: OpenCogFactory.createOpenCogAgent,
  createAtomSpace: OpenCogFactory.createAtomSpace
};