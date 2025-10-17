/**
 * Atom - Basic unit of knowledge in OpenCog AtomSpace
 * Represents atomic data with type, name, and associated values
 */

// const { v4: uuidv4 } = require('uuid');
// Simple UUID alternative for testing
function uuidv4() {
  return 'atom_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

class Atom {
  constructor(type, name = null, outgoing = [], tv = null) {
    this.id = uuidv4();
    this.type = type; // AtomType (e.g., 'ConceptNode', 'PredicateNode', 'LinkType')
    this.name = name; // Name for nodes
    this.outgoing = outgoing || []; // Outgoing set for links
    this.tv = tv || new TruthValue(); // Truth value
    this.av = new AttentionValue(); // Attention value
    this.incoming = new Set(); // Incoming set - atoms that point to this atom
    this.values = new Map(); // Associated values
    this.timestamp = Date.now();
  }

  /**
   * Get the arity (number of outgoing atoms)
   */
  getArity() {
    return this.outgoing.length;
  }

  /**
   * Check if this is a node (no outgoing atoms)
   */
  isNode() {
    return this.outgoing.length === 0;
  }

  /**
   * Check if this is a link (has outgoing atoms)
   */
  isLink() {
    return this.outgoing.length > 0;
  }

  /**
   * Add to incoming set
   */
  addIncoming(atom) {
    this.incoming.add(atom);
  }

  /**
   * Remove from incoming set
   */
  removeIncoming(atom) {
    this.incoming.delete(atom);
  }

  /**
   * Get incoming set as array
   */
  getIncoming() {
    return Array.from(this.incoming);
  }

  /**
   * Set truth value
   */
  setTruthValue(tv) {
    this.tv = tv;
    return this;
  }

  /**
   * Get truth value
   */
  getTruthValue() {
    return this.tv;
  }

  /**
   * Set attention value
   */
  setAttentionValue(av) {
    this.av = av;
    return this;
  }

  /**
   * Get attention value
   */
  getAttentionValue() {
    return this.av;
  }

  /**
   * Set associated value
   */
  setValue(key, value) {
    this.values.set(key, value);
    return this;
  }

  /**
   * Get associated value
   */
  getValue(key) {
    return this.values.get(key);
  }

  /**
   * Get all values
   */
  getValues() {
    return this.values;
  }

  /**
   * Generate string representation
   */
  toString() {
    if (this.isNode()) {
      return `(${this.type} "${this.name}")`;
    } else {
      const outgoingStr = this.outgoing.map(atom => atom.toString()).join(' ');
      return `(${this.type} ${outgoingStr})`;
    }
  }

  /**
   * Generate JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      outgoing: this.outgoing.map(atom => atom.id),
      tv: this.tv.toJSON(),
      av: this.av.toJSON(),
      timestamp: this.timestamp
    };
  }
}

/**
 * TruthValue - Represents truth value with strength and confidence
 */
class TruthValue {
  constructor(strength = 0.5, confidence = 0.0) {
    this.strength = Math.max(0, Math.min(1, strength)); // [0,1]
    this.confidence = Math.max(0, Math.min(1, confidence)); // [0,1]
  }

  /**
   * Get the mean (strength)
   */
  getMean() {
    return this.strength;
  }

  /**
   * Get confidence
   */
  getConfidence() {
    return this.confidence;
  }

  /**
   * Set strength
   */
  setStrength(strength) {
    this.strength = Math.max(0, Math.min(1, strength));
    return this;
  }

  /**
   * Set confidence
   */
  setConfidence(confidence) {
    this.confidence = Math.max(0, Math.min(1, confidence));
    return this;
  }

  /**
   * Check if truth value is valid
   */
  isValid() {
    return this.confidence > 0;
  }

  /**
   * Generate JSON representation
   */
  toJSON() {
    return {
      strength: this.strength,
      confidence: this.confidence
    };
  }

  toString() {
    return `<${this.strength.toFixed(3)}, ${this.confidence.toFixed(3)}>`;
  }
}

/**
 * AttentionValue - Represents attention allocation with STI, LTI, and VLTI
 */
class AttentionValue {
  constructor(sti = 0, lti = 0, vlti = false) {
    this.sti = sti; // Short-Term Importance
    this.lti = lti; // Long-Term Importance  
    this.vlti = vlti; // Very Long-Term Importance (boolean)
  }

  /**
   * Get Short-Term Importance
   */
  getSTI() {
    return this.sti;
  }

  /**
   * Get Long-Term Importance
   */
  getLTI() {
    return this.lti;
  }

  /**
   * Get Very Long-Term Importance
   */
  getVLTI() {
    return this.vlti;
  }

  /**
   * Set Short-Term Importance
   */
  setSTI(sti) {
    this.sti = sti;
    return this;
  }

  /**
   * Set Long-Term Importance
   */
  setLTI(lti) {
    this.lti = lti;
    return this;
  }

  /**
   * Set Very Long-Term Importance
   */
  setVLTI(vlti) {
    this.vlti = vlti;
    return this;
  }

  /**
   * Generate JSON representation
   */
  toJSON() {
    return {
      sti: this.sti,
      lti: this.lti,
      vlti: this.vlti
    };
  }

  toString() {
    return `[${this.sti}, ${this.lti}, ${this.vlti}]`;
  }
}

module.exports = {
  Atom,
  TruthValue,
  AttentionValue
};