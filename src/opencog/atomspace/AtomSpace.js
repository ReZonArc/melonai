/**
 * AtomSpace - Graph database for storing and managing atoms
 * Core component of OpenCog for knowledge representation
 */

const { Atom, TruthValue, AttentionValue } = require('./Atom');
const AtomTypes = require('./AtomTypes');

class AtomSpace {
  constructor() {
    this.atoms = new Map(); // atom_id -> Atom
    this.typeIndex = new Map(); // type -> Set<atom_id>
    this.nameIndex = new Map(); // name -> Set<atom_id>
    this.incomingIndex = new Map(); // atom_id -> Set<incoming_atom_ids>
    this.attentionalFocus = new Set(); // Atoms in attentional focus
    this.size = 0;
  }

  /**
   * Add an atom to the AtomSpace
   */
  addAtom(atom) {
    if (!(atom instanceof Atom)) {
      throw new Error('Object must be an instance of Atom');
    }

    // Check if atom already exists
    if (this.atoms.has(atom.id)) {
      return this.atoms.get(atom.id);
    }

    // Add to main store
    this.atoms.set(atom.id, atom);
    this.size++;

    // Update type index
    if (!this.typeIndex.has(atom.type)) {
      this.typeIndex.set(atom.type, new Set());
    }
    this.typeIndex.get(atom.type).add(atom.id);

    // Update name index for nodes
    if (atom.isNode() && atom.name) {
      if (!this.nameIndex.has(atom.name)) {
        this.nameIndex.set(atom.name, new Set());
      }
      this.nameIndex.get(atom.name).add(atom.id);
    }

    // Update incoming sets for outgoing atoms
    for (const outgoingAtom of atom.outgoing) {
      if (outgoingAtom instanceof Atom) {
        outgoingAtom.addIncoming(atom);
        
        if (!this.incomingIndex.has(outgoingAtom.id)) {
          this.incomingIndex.set(outgoingAtom.id, new Set());
        }
        this.incomingIndex.get(outgoingAtom.id).add(atom.id);
      }
    }

    return atom;
  }

  /**
   * Remove an atom from the AtomSpace
   */
  removeAtom(atomId) {
    const atom = this.atoms.get(atomId);
    if (!atom) {
      return false;
    }

    // Remove from attentional focus
    this.attentionalFocus.delete(atomId);

    // Remove from type index
    const typeSet = this.typeIndex.get(atom.type);
    if (typeSet) {
      typeSet.delete(atomId);
      if (typeSet.size === 0) {
        this.typeIndex.delete(atom.type);
      }
    }

    // Remove from name index
    if (atom.name) {
      const nameSet = this.nameIndex.get(atom.name);
      if (nameSet) {
        nameSet.delete(atomId);
        if (nameSet.size === 0) {
          this.nameIndex.delete(atom.name);
        }
      }
    }

    // Update incoming sets
    for (const outgoingAtom of atom.outgoing) {
      if (outgoingAtom instanceof Atom) {
        outgoingAtom.removeIncoming(atom);
        const incomingSet = this.incomingIndex.get(outgoingAtom.id);
        if (incomingSet) {
          incomingSet.delete(atomId);
        }
      }
    }

    // Remove incoming references
    const incomingSet = this.incomingIndex.get(atomId);
    if (incomingSet) {
      for (const incomingId of incomingSet) {
        const incomingAtom = this.atoms.get(incomingId);
        if (incomingAtom) {
          incomingAtom.removeIncoming(atom);
        }
      }
      this.incomingIndex.delete(atomId);
    }

    // Remove from main store
    this.atoms.delete(atomId);
    this.size--;

    return true;
  }

  /**
   * Get an atom by ID
   */
  getAtom(atomId) {
    return this.atoms.get(atomId);
  }

  /**
   * Check if atom exists
   */
  hasAtom(atomId) {
    return this.atoms.has(atomId);
  }

  /**
   * Create a node
   */
  addNode(type, name = null, tv = null) {
    // Check if node already exists
    const existing = this.getNodeByName(type, name);
    if (existing) {
      if (tv) {
        existing.setTruthValue(tv);
      }
      return existing;
    }

    const atom = new Atom(type, name, [], tv);
    return this.addAtom(atom);
  }

  /**
   * Create a link
   */
  addLink(type, outgoing = [], tv = null) {
    // Check if link already exists
    const existing = this.getLinkByOutgoing(type, outgoing);
    if (existing) {
      if (tv) {
        existing.setTruthValue(tv);
      }
      return existing;
    }

    const atom = new Atom(type, null, outgoing, tv);
    return this.addAtom(atom);
  }

  /**
   * Get node by type and name
   */
  getNodeByName(type, name) {
    const nameSet = this.nameIndex.get(name);
    if (!nameSet) return null;

    for (const atomId of nameSet) {
      const atom = this.atoms.get(atomId);
      if (atom && atom.type === type) {
        return atom;
      }
    }
    return null;
  }

  /**
   * Get link by type and outgoing atoms
   */
  getLinkByOutgoing(type, outgoing) {
    const typeSet = this.typeIndex.get(type);
    if (!typeSet) return null;

    for (const atomId of typeSet) {
      const atom = this.atoms.get(atomId);
      if (atom && atom.isLink() && this.arraysEqual(atom.outgoing, outgoing)) {
        return atom;
      }
    }
    return null;
  }

  /**
   * Get all atoms of a specific type
   */
  getAtomsByType(type) {
    const typeSet = this.typeIndex.get(type);
    if (!typeSet) return [];

    return Array.from(typeSet).map(id => this.atoms.get(id)).filter(atom => atom);
  }

  /**
   * Get all atoms with a specific name
   */
  getAtomsByName(name) {
    const nameSet = this.nameIndex.get(name);
    if (!nameSet) return [];

    return Array.from(nameSet).map(id => this.atoms.get(id)).filter(atom => atom);
  }

  /**
   * Get incoming atoms for a given atom
   */
  getIncoming(atomId) {
    const incomingSet = this.incomingIndex.get(atomId);
    if (!incomingSet) return [];

    return Array.from(incomingSet).map(id => this.atoms.get(id)).filter(atom => atom);
  }

  /**
   * Get all atoms in the AtomSpace
   */
  getAllAtoms() {
    return Array.from(this.atoms.values());
  }

  /**
   * Get AtomSpace size
   */
  getSize() {
    return this.size;
  }

  /**
   * Add atom to attentional focus
   */
  addToAttentionalFocus(atomId) {
    if (this.atoms.has(atomId)) {
      this.attentionalFocus.add(atomId);
      return true;
    }
    return false;
  }

  /**
   * Remove atom from attentional focus
   */
  removeFromAttentionalFocus(atomId) {
    return this.attentionalFocus.delete(atomId);
  }

  /**
   * Get atoms in attentional focus
   */
  getAttentionalFocus() {
    return Array.from(this.attentionalFocus).map(id => this.atoms.get(id)).filter(atom => atom);
  }

  /**
   * Query atoms by pattern
   */
  query(pattern) {
    const results = [];
    
    // Simple pattern matching implementation
    for (const atom of this.atoms.values()) {
      if (this.matchesPattern(atom, pattern)) {
        results.push(atom);
      }
    }
    
    return results;
  }

  /**
   * Check if atom matches pattern
   */
  matchesPattern(atom, pattern) {
    if (pattern.type && atom.type !== pattern.type) {
      return false;
    }
    
    if (pattern.name && atom.name !== pattern.name) {
      return false;
    }
    
    if (pattern.arity !== undefined && atom.getArity() !== pattern.arity) {
      return false;
    }
    
    return true;
  }

  /**
   * Helper method to compare arrays
   */
  arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  /**
   * Clear the AtomSpace
   */
  clear() {
    this.atoms.clear();
    this.typeIndex.clear();
    this.nameIndex.clear();
    this.incomingIndex.clear();
    this.attentionalFocus.clear();
    this.size = 0;
  }

  /**
   * Export AtomSpace to JSON
   */
  toJSON() {
    return {
      atoms: Array.from(this.atoms.values()).map(atom => atom.toJSON()),
      size: this.size,
      timestamp: Date.now()
    };
  }

  /**
   * Import AtomSpace from JSON
   */
  static fromJSON(data) {
    const atomSpace = new AtomSpace();
    
    // First pass: create all atoms
    const atomMap = new Map();
    for (const atomData of data.atoms) {
      const atom = new Atom(atomData.type, atomData.name);
      atom.id = atomData.id;
      atom.timestamp = atomData.timestamp;
      atom.tv = new TruthValue(atomData.tv.strength, atomData.tv.confidence);
      atom.av = new AttentionValue(atomData.av.sti, atomData.av.lti, atomData.av.vlti);
      atomMap.set(atom.id, atom);
    }
    
    // Second pass: set up outgoing relationships
    for (const atomData of data.atoms) {
      const atom = atomMap.get(atomData.id);
      if (atomData.outgoing && atomData.outgoing.length > 0) {
        atom.outgoing = atomData.outgoing.map(id => atomMap.get(id)).filter(a => a);
      }
      atomSpace.addAtom(atom);
    }
    
    return atomSpace;
  }

  /**
   * Get statistics about the AtomSpace
   */
  getStatistics() {
    const stats = {
      totalAtoms: this.size,
      nodeCount: 0,
      linkCount: 0,
      typeDistribution: {},
      attentionalFocusSize: this.attentionalFocus.size
    };

    for (const atom of this.atoms.values()) {
      if (atom.isNode()) {
        stats.nodeCount++;
      } else {
        stats.linkCount++;
      }

      stats.typeDistribution[atom.type] = (stats.typeDistribution[atom.type] || 0) + 1;
    }

    return stats;
  }
}

module.exports = AtomSpace;