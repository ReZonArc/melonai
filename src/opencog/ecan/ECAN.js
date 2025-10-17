/**
 * ECAN (Economic Attention Allocation)
 * Manages attention allocation and resource distribution in the AtomSpace
 * Based on economic principles for cognitive resource management
 */

const { ATOM_TYPES } = require('../atomspace/AtomTypes');

class ECAN {
  constructor(atomSpace, options = {}) {
    this.atomSpace = atomSpace;
    
    // ECAN Configuration
    this.config = {
      maxAF: options.maxAF || 100, // Maximum atoms in attentional focus
      minSTI: options.minSTI || -1000, // Minimum STI for attentional focus
      maxSTI: options.maxSTI || 1000, // Maximum STI
      stimulusAmount: options.stimulusAmount || 10, // Default stimulus amount
      decayRate: options.decayRate || 0.01, // STI decay rate per cycle
      spreadProbability: options.spreadProbability || 0.1, // Probability of spreading activation
      
      // Economic parameters
      totalSTI: options.totalSTI || 10000, // Total STI in the system
      totalLTI: options.totalLTI || 10000, // Total LTI in the system
      rentAmount: options.rentAmount || 1, // Rent charged for being in AF
      
      // Hebbian learning parameters
      hebbianLearningRate: options.hebbianLearningRate || 0.1,
      
      // Importance diffusion parameters
      diffusionRate: options.diffusionRate || 0.2
    };

    // Internal state
    this.currentSTIPool = this.config.totalSTI;
    this.currentLTIPool = this.config.totalLTI;
    this.cycle = 0;
    
    // Statistics
    this.stats = {
      cyclesRun: 0,
      totalStimuli: 0,
      averageAFSize: 0,
      importanceSpread: 0
    };
  }

  /**
   * Run one ECAN cycle
   */
  runCycle() {
    this.cycle++;
    this.stats.cyclesRun++;

    // 1. Collect rent from atoms in attentional focus
    this.collectRent();

    // 2. Apply STI decay
    this.applySTIDecay();

    // 3. Spread importance through Hebbian links
    this.spreadImportance();

    // 4. Update attentional focus
    this.updateAttentionalFocus();

    // 5. Apply forgetting (remove low importance atoms)
    this.applyForgetting();

    // 6. Update statistics
    this.updateStatistics();
  }

  /**
   * Stimulate an atom with importance
   */
  stimulateAtom(atomId, amount = null) {
    const atom = this.atomSpace.getAtom(atomId);
    if (!atom) return false;

    const stimulusAmount = amount || this.config.stimulusAmount;
    
    // Add STI to the atom
    const currentSTI = atom.getAttentionValue().getSTI();
    const newSTI = Math.min(currentSTI + stimulusAmount, this.config.maxSTI);
    
    atom.getAttentionValue().setSTI(newSTI);
    
    // Deduct from STI pool
    this.currentSTIPool = Math.max(0, this.currentSTIPool - stimulusAmount);
    
    this.stats.totalStimuli++;
    
    return true;
  }

  /**
   * Collect rent from atoms in attentional focus
   */
  collectRent() {
    const attentionalFocus = this.atomSpace.getAttentionalFocus();
    
    for (const atom of attentionalFocus) {
      const av = atom.getAttentionValue();
      const currentSTI = av.getSTI();
      const newSTI = Math.max(currentSTI - this.config.rentAmount, this.config.minSTI);
      
      av.setSTI(newSTI);
      
      // Add rent back to the pool
      this.currentSTIPool += this.config.rentAmount;
    }
  }

  /**
   * Apply STI decay to all atoms
   */
  applySTIDecay() {
    const allAtoms = this.atomSpace.getAllAtoms();
    
    for (const atom of allAtoms) {
      const av = atom.getAttentionValue();
      const currentSTI = av.getSTI();
      
      if (currentSTI > 0) {
        const decay = currentSTI * this.config.decayRate;
        const newSTI = Math.max(currentSTI - decay, 0);
        av.setSTI(newSTI);
        
        // Add decay back to the pool
        this.currentSTIPool += decay;
      }
    }
  }

  /**
   * Spread importance through Hebbian links and other connections
   */
  spreadImportance() {
    const attentionalFocus = this.atomSpace.getAttentionalFocus();
    let totalSpread = 0;
    
    for (const atom of attentionalFocus) {
      const currentSTI = atom.getAttentionValue().getSTI();
      
      // Only spread if atom has sufficient importance
      if (currentSTI > this.config.minSTI * 2) {
        totalSpread += this.spreadFromAtom(atom);
      }
    }
    
    this.stats.importanceSpread = totalSpread;
  }

  /**
   * Spread importance from a single atom to its neighbors
   */
  spreadFromAtom(atom) {
    const av = atom.getAttentionValue();
    const currentSTI = av.getSTI();
    const spreadAmount = currentSTI * this.config.diffusionRate;
    
    if (spreadAmount < 1) return 0;
    
    // Get connected atoms (incoming and outgoing)
    const connectedAtoms = new Set();
    
    // Add incoming atoms
    const incoming = this.atomSpace.getIncoming(atom.id);
    incoming.forEach(inAtom => connectedAtoms.add(inAtom));
    
    // Add outgoing atoms for links
    if (atom.isLink()) {
      atom.outgoing.forEach(outAtom => connectedAtoms.add(outAtom));
    }
    
    if (connectedAtoms.size === 0) return 0;
    
    const amountPerAtom = spreadAmount / connectedAtoms.size;
    let totalSpread = 0;
    
    for (const connectedAtom of connectedAtoms) {
      if (Math.random() < this.config.spreadProbability) {
        const connectedAV = connectedAtom.getAttentionValue();
        const newSTI = Math.min(
          connectedAV.getSTI() + amountPerAtom,
          this.config.maxSTI
        );
        connectedAV.setSTI(newSTI);
        totalSpread += amountPerAtom;
      }
    }
    
    // Reduce STI from source atom
    av.setSTI(currentSTI - totalSpread);
    
    return totalSpread;
  }

  /**
   * Update the attentional focus based on STI values
   */
  updateAttentionalFocus() {
    // Clear current attentional focus
    const currentAF = this.atomSpace.getAttentionalFocus();
    currentAF.forEach(atom => {
      this.atomSpace.removeFromAttentionalFocus(atom.id);
    });
    
    // Get all atoms sorted by STI
    const allAtoms = this.atomSpace.getAllAtoms();
    const sortedAtoms = allAtoms
      .filter(atom => atom.getAttentionValue().getSTI() >= this.config.minSTI)
      .sort((a, b) => b.getAttentionValue().getSTI() - a.getAttentionValue().getSTI())
      .slice(0, this.config.maxAF);
    
    // Add top atoms to attentional focus
    sortedAtoms.forEach(atom => {
      this.atomSpace.addToAttentionalFocus(atom.id);
    });
  }

  /**
   * Apply forgetting by removing atoms with very low importance
   */
  applyForgetting() {
    const forgetThreshold = this.config.minSTI * 2;
    const allAtoms = this.atomSpace.getAllAtoms();
    
    const atomsToForget = allAtoms.filter(atom => {
      const sti = atom.getAttentionValue().getSTI();
      const lti = atom.getAttentionValue().getLTI();
      const vlti = atom.getAttentionValue().getVLTI();
      
      // Don't forget atoms with high LTI or VLTI
      if (lti > 0 || vlti) return false;
      
      // Forget atoms with very low STI
      return sti < forgetThreshold;
    });
    
    // Remove forgotten atoms (with some randomness)
    atomsToForget.forEach(atom => {
      if (Math.random() < 0.1) { // 10% chance of forgetting
        this.atomSpace.removeAtom(atom.id);
      }
    });
  }

  /**
   * Perform Hebbian learning between atoms
   */
  performHebbianLearning(atom1Id, atom2Id) {
    const atom1 = this.atomSpace.getAtom(atom1Id);
    const atom2 = this.atomSpace.getAtom(atom2Id);
    
    if (!atom1 || !atom2) return false;
    
    // Check if Hebbian link already exists
    let hebbianLink = this.findHebbianLink(atom1, atom2);
    
    if (!hebbianLink) {
      // Create new Hebbian link
      hebbianLink = this.atomSpace.addLink(
        ATOM_TYPES.HEBBIAN_LINK,
        [atom1, atom2],
        new (require('../atomspace/Atom').TruthValue)(0.1, 0.1)
      );
    }
    
    // Strengthen the link
    const tv = hebbianLink.getTruthValue();
    const newStrength = Math.min(
      tv.getStrength() + this.config.hebbianLearningRate,
      1.0
    );
    const newConfidence = Math.min(
      tv.getConfidence() + this.config.hebbianLearningRate * 0.1,
      1.0
    );
    
    hebbianLink.setTruthValue(
      new (require('../atomspace/Atom').TruthValue)(newStrength, newConfidence)
    );
    
    return true;
  }

  /**
   * Find existing Hebbian link between two atoms
   */
  findHebbianLink(atom1, atom2) {
    const hebbianLinks = this.atomSpace.getAtomsByType(ATOM_TYPES.HEBBIAN_LINK);
    
    return hebbianLinks.find(link => {
      const outgoing = link.outgoing;
      return (outgoing[0] === atom1 && outgoing[1] === atom2) ||
             (outgoing[0] === atom2 && outgoing[1] === atom1);
    });
  }

  /**
   * Get atoms with highest STI values
   */
  getHighestSTIAtoms(count = 10) {
    const allAtoms = this.atomSpace.getAllAtoms();
    return allAtoms
      .sort((a, b) => b.getAttentionValue().getSTI() - a.getAttentionValue().getSTI())
      .slice(0, count);
  }

  /**
   * Update statistics
   */
  updateStatistics() {
    const af = this.atomSpace.getAttentionalFocus();
    this.stats.averageAFSize = (this.stats.averageAFSize * (this.cycle - 1) + af.length) / this.cycle;
  }

  /**
   * Get ECAN statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      currentCycle: this.cycle,
      stiPool: this.currentSTIPool,
      ltiPool: this.currentLTIPool,
      attentionalFocusSize: this.atomSpace.getAttentionalFocus().length,
      totalAtoms: this.atomSpace.getSize()
    };
  }

  /**
   * Reset ECAN state
   */
  reset() {
    this.cycle = 0;
    this.currentSTIPool = this.config.totalSTI;
    this.currentLTIPool = this.config.totalLTI;
    this.stats = {
      cyclesRun: 0,
      totalStimuli: 0,
      averageAFSize: 0,
      importanceSpread: 0
    };
  }
}

module.exports = ECAN;