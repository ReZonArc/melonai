/**
 * PLN (Probabilistic Logic Networks)
 * Implements probabilistic reasoning and inference for uncertain knowledge
 */

const { ATOM_TYPES } = require('../atomspace/AtomTypes');
const { TruthValue } = require('../atomspace/Atom');

class PLN {
  constructor(atomSpace, options = {}) {
    this.atomSpace = atomSpace;
    
    // PLN Configuration
    this.config = {
      // Inference parameters
      minConfidence: options.minConfidence || 0.01,
      maxInferenceDepth: options.maxInferenceDepth || 5,
      strengthThreshold: options.strengthThreshold || 0.1,
      
      // Truth value combination parameters
      defaultConfidence: options.defaultConfidence || 0.1,
      defaultStrength: options.defaultStrength || 0.5,
      
      // Revision parameters
      revisionInflationFactor: options.revisionInflationFactor || 1.2
    };

    // Inference rules
    this.rules = new Map();
    this.initializeInferenceRules();
  }

  /**
   * Initialize basic PLN inference rules
   */
  initializeInferenceRules() {
    // Deduction Rule: A->B, B->C |- A->C
    this.rules.set('deduction', {
      name: 'Deduction',
      pattern: {
        premise1: { type: ATOM_TYPES.IMPLICATION_LINK },
        premise2: { type: ATOM_TYPES.IMPLICATION_LINK }
      },
      apply: this.applyDeduction.bind(this)
    });

    // Induction Rule: A->B, A->C |- C->B
    this.rules.set('induction', {
      name: 'Induction',
      pattern: {
        premise1: { type: ATOM_TYPES.IMPLICATION_LINK },
        premise2: { type: ATOM_TYPES.IMPLICATION_LINK }
      },
      apply: this.applyInduction.bind(this)
    });

    // Abduction Rule: A->B, C->B |- A->C
    this.rules.set('abduction', {
      name: 'Abduction',
      pattern: {
        premise1: { type: ATOM_TYPES.IMPLICATION_LINK },
        premise2: { type: ATOM_TYPES.IMPLICATION_LINK }
      },
      apply: this.applyAbduction.bind(this)
    });

    // Revision Rule: Combine multiple truth values for same statement
    this.rules.set('revision', {
      name: 'Revision',
      apply: this.applyRevision.bind(this)
    });

    // Modus Ponens: A->B, A |- B
    this.rules.set('modusPonens', {
      name: 'Modus Ponens',
      pattern: {
        premise1: { type: ATOM_TYPES.IMPLICATION_LINK },
        premise2: { type: ATOM_TYPES.EVALUATION_LINK }
      },
      apply: this.applyModusPonens.bind(this)
    });
  }

  /**
   * Perform probabilistic inference
   */
  performInference(maxIterations = 100) {
    const results = [];
    let iteration = 0;

    while (iteration < maxIterations) {
      let newInferences = 0;

      // Apply each inference rule
      for (const [ruleName, rule] of this.rules) {
        const ruleResults = this.applyRule(rule);
        newInferences += ruleResults.length;
        results.push(...ruleResults);
      }

      iteration++;
      
      // Stop if no new inferences were made
      if (newInferences === 0) {
        break;
      }
    }

    return {
      results,
      iterations: iteration,
      totalInferences: results.length
    };
  }

  /**
   * Apply a specific inference rule
   */
  applyRule(rule) {
    const results = [];
    
    try {
      // Find atoms matching the rule pattern
      const candidates = this.findRuleCandidates(rule);
      
      for (const candidate of candidates) {
        const result = rule.apply(candidate);
        if (result && this.isValidInference(result)) {
          results.push(result);
          
          // Add the inferred atom to the AtomSpace
          if (result.atom) {
            this.atomSpace.addAtom(result.atom);
          }
        }
      }
    } catch (error) {
      console.error(`Error applying rule ${rule.name}:`, error);
    }

    return results;
  }

  /**
   * Find candidate atoms for rule application
   */
  findRuleCandidates(rule) {
    const candidates = [];
    
    if (!rule.pattern) {
      return candidates;
    }

    // Simple pattern matching - can be enhanced
    const atoms = this.atomSpace.getAllAtoms();
    
    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const atom1 = atoms[i];
        const atom2 = atoms[j];
        
        if (this.matchesPattern(atom1, rule.pattern.premise1) &&
            this.matchesPattern(atom2, rule.pattern.premise2)) {
          candidates.push({ premise1: atom1, premise2: atom2 });
        }
      }
    }

    return candidates;
  }

  /**
   * Check if atom matches pattern
   */
  matchesPattern(atom, pattern) {
    if (pattern.type && atom.type !== pattern.type) {
      return false;
    }
    return true;
  }

  /**
   * Apply deduction rule: A->B, B->C |- A->C
   */
  applyDeduction(candidate) {
    const { premise1, premise2 } = candidate;
    
    // Check if premise1: A->B and premise2: B->C
    if (premise1.outgoing.length !== 2 || premise2.outgoing.length !== 2) {
      return null;
    }

    const A = premise1.outgoing[0];
    const B1 = premise1.outgoing[1];
    const B2 = premise2.outgoing[0];
    const C = premise2.outgoing[1];

    // Check if B1 and B2 are the same (or similar enough)
    if (!this.atomsAreEquivalent(B1, B2)) {
      return null;
    }

    // Calculate truth value for A->C
    const tv1 = premise1.getTruthValue();
    const tv2 = premise2.getTruthValue();
    const conclusionTV = this.calculateDeductionTV(tv1, tv2);

    // Create conclusion A->C
    const conclusion = this.atomSpace.addLink(
      ATOM_TYPES.IMPLICATION_LINK,
      [A, C],
      conclusionTV
    );

    return {
      rule: 'deduction',
      premises: [premise1, premise2],
      conclusion,
      atom: conclusion,
      truthValue: conclusionTV
    };
  }

  /**
   * Apply induction rule: A->B, A->C |- C->B
   */
  applyInduction(candidate) {
    const { premise1, premise2 } = candidate;
    
    if (premise1.outgoing.length !== 2 || premise2.outgoing.length !== 2) {
      return null;
    }

    const A1 = premise1.outgoing[0];
    const B = premise1.outgoing[1];
    const A2 = premise2.outgoing[0];
    const C = premise2.outgoing[1];

    // Check if A1 and A2 are the same
    if (!this.atomsAreEquivalent(A1, A2)) {
      return null;
    }

    // Calculate truth value for C->B
    const tv1 = premise1.getTruthValue();
    const tv2 = premise2.getTruthValue();
    const conclusionTV = this.calculateInductionTV(tv1, tv2);

    // Create conclusion C->B
    const conclusion = this.atomSpace.addLink(
      ATOM_TYPES.IMPLICATION_LINK,
      [C, B],
      conclusionTV
    );

    return {
      rule: 'induction',
      premises: [premise1, premise2],
      conclusion,
      atom: conclusion,
      truthValue: conclusionTV
    };
  }

  /**
   * Apply abduction rule: A->B, C->B |- A->C
   */
  applyAbduction(candidate) {
    const { premise1, premise2 } = candidate;
    
    if (premise1.outgoing.length !== 2 || premise2.outgoing.length !== 2) {
      return null;
    }

    const A = premise1.outgoing[0];
    const B1 = premise1.outgoing[1];
    const C = premise2.outgoing[0];
    const B2 = premise2.outgoing[1];

    // Check if B1 and B2 are the same
    if (!this.atomsAreEquivalent(B1, B2)) {
      return null;
    }

    // Calculate truth value for A->C
    const tv1 = premise1.getTruthValue();
    const tv2 = premise2.getTruthValue();
    const conclusionTV = this.calculateAbductionTV(tv1, tv2);

    // Create conclusion A->C
    const conclusion = this.atomSpace.addLink(
      ATOM_TYPES.IMPLICATION_LINK,
      [A, C],
      conclusionTV
    );

    return {
      rule: 'abduction',
      premises: [premise1, premise2],
      conclusion,
      atom: conclusion,
      truthValue: conclusionTV
    };
  }

  /**
   * Apply modus ponens: A->B, A |- B
   */
  applyModusPonens(candidate) {
    const { premise1, premise2 } = candidate;
    
    if (premise1.outgoing.length !== 2) {
      return null;
    }

    const A1 = premise1.outgoing[0];
    const B = premise1.outgoing[1];
    
    // Check if premise2 evaluates A as true
    if (!this.evaluatesAsTrue(premise2, A1)) {
      return null;
    }

    // Calculate truth value for B
    const tv1 = premise1.getTruthValue();
    const tv2 = premise2.getTruthValue();
    const conclusionTV = this.calculateModusPonensTV(tv1, tv2);

    // Create conclusion: B is true
    const conclusion = this.atomSpace.addLink(
      ATOM_TYPES.EVALUATION_LINK,
      [this.atomSpace.addNode(ATOM_TYPES.PREDICATE_NODE, 'true'), B],
      conclusionTV
    );

    return {
      rule: 'modusPonens',
      premises: [premise1, premise2],
      conclusion,
      atom: conclusion,
      truthValue: conclusionTV
    };
  }

  /**
   * Apply revision rule: combine multiple truth values
   */
  applyRevision(candidate) {
    // This would be called when the same statement has multiple truth values
    const { truthValues } = candidate;
    
    if (!truthValues || truthValues.length < 2) {
      return null;
    }

    const revisedTV = this.reviseMultipleTruthValues(truthValues);
    
    return {
      rule: 'revision',
      truthValue: revisedTV
    };
  }

  /**
   * Calculate truth value for deduction
   */
  calculateDeductionTV(tv1, tv2) {
    const s1 = tv1.getStrength();
    const c1 = tv1.getConfidence();
    const s2 = tv2.getStrength();
    const c2 = tv2.getConfidence();

    // PLN deduction formula
    const strength = s1 * s2;
    const confidence = c1 * c2 * (1 - s1 + s1 * s2);

    return new TruthValue(strength, Math.min(confidence, 1.0));
  }

  /**
   * Calculate truth value for induction
   */
  calculateInductionTV(tv1, tv2) {
    const s1 = tv1.getStrength();
    const c1 = tv1.getConfidence();
    const s2 = tv2.getStrength();
    const c2 = tv2.getConfidence();

    // PLN induction formula (simplified)
    const strength = s2;
    const confidence = c1 * c2 * s1;

    return new TruthValue(strength, Math.min(confidence, 1.0));
  }

  /**
   * Calculate truth value for abduction
   */
  calculateAbductionTV(tv1, tv2) {
    const s1 = tv1.getStrength();
    const c1 = tv1.getConfidence();
    const s2 = tv2.getStrength();
    const c2 = tv2.getConfidence();

    // PLN abduction formula (simplified)
    const strength = s2 * s1;
    const confidence = c1 * c2;

    return new TruthValue(strength, Math.min(confidence, 1.0));
  }

  /**
   * Calculate truth value for modus ponens
   */
  calculateModusPonensTV(tv1, tv2) {
    const s1 = tv1.getStrength();
    const c1 = tv1.getConfidence();
    const s2 = tv2.getStrength();
    const c2 = tv2.getConfidence();

    // Modus ponens formula
    const strength = s1 * s2;
    const confidence = c1 * c2;

    return new TruthValue(strength, Math.min(confidence, 1.0));
  }

  /**
   * Revise multiple truth values into one
   */
  reviseMultipleTruthValues(truthValues) {
    if (truthValues.length === 0) {
      return new TruthValue();
    }

    if (truthValues.length === 1) {
      return truthValues[0];
    }

    let revisedTV = truthValues[0];
    
    for (let i = 1; i < truthValues.length; i++) {
      revisedTV = this.reviseTwoTruthValues(revisedTV, truthValues[i]);
    }

    return revisedTV;
  }

  /**
   * Revise two truth values
   */
  reviseTwoTruthValues(tv1, tv2) {
    const s1 = tv1.getStrength();
    const c1 = tv1.getConfidence();
    const s2 = tv2.getStrength();
    const c2 = tv2.getConfidence();

    // PLN revision formula
    const totalConfidence = c1 + c2 - c1 * c2;
    const strength = (s1 * c1 + s2 * c2 - s1 * s2 * c1 * c2) / totalConfidence;
    const confidence = totalConfidence * this.config.revisionInflationFactor;

    return new TruthValue(strength, Math.min(confidence, 1.0));
  }

  /**
   * Check if two atoms are equivalent
   */
  atomsAreEquivalent(atom1, atom2) {
    // Simple equality check - can be enhanced with similarity measures
    return atom1.id === atom2.id || 
           (atom1.type === atom2.type && atom1.name === atom2.name);
  }

  /**
   * Check if an evaluation link evaluates an atom as true
   */
  evaluatesAsTrue(evaluationLink, atom) {
    if (evaluationLink.type !== ATOM_TYPES.EVALUATION_LINK || 
        evaluationLink.outgoing.length !== 2) {
      return false;
    }

    const predicate = evaluationLink.outgoing[0];
    const argument = evaluationLink.outgoing[1];

    // Check if argument matches atom and truth value is high
    const matches = this.atomsAreEquivalent(argument, atom);
    const tv = evaluationLink.getTruthValue();
    const isTrue = tv.getStrength() > 0.5 && tv.getConfidence() > this.config.minConfidence;

    return matches && isTrue;
  }

  /**
   * Check if inference result is valid
   */
  isValidInference(result) {
    if (!result || !result.truthValue) {
      return false;
    }

    const tv = result.truthValue;
    return tv.getConfidence() >= this.config.minConfidence &&
           tv.getStrength() >= this.config.strengthThreshold;
  }

  /**
   * Get inference statistics
   */
  getStatistics() {
    const rulesApplied = Array.from(this.rules.keys());
    const totalAtoms = this.atomSpace.getSize();
    const implicationLinks = this.atomSpace.getAtomsByType(ATOM_TYPES.IMPLICATION_LINK);
    const evaluationLinks = this.atomSpace.getAtomsByType(ATOM_TYPES.EVALUATION_LINK);

    return {
      rulesAvailable: rulesApplied.length,
      totalAtoms,
      implicationLinks: implicationLinks.length,
      evaluationLinks: evaluationLinks.length,
      config: this.config
    };
  }
}

module.exports = PLN;