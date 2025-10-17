/**
 * OpenCog Integration Module
 * Main interface for integrating OpenCog capabilities with LemonAI
 */

const AtomSpace = require('./atomspace/AtomSpace');
const { Atom, TruthValue, AttentionValue } = require('./atomspace/Atom');
const { ATOM_TYPES, isNodeType, isLinkType } = require('./atomspace/AtomTypes');
const ECAN = require('./ecan/ECAN');
const PLN = require('./pln/PLN');
const CogServer = require('./cogserver/CogServer');

class OpenCogIntegration {
  constructor(options = {}) {
    // Core OpenCog components
    this.atomSpace = new AtomSpace();
    this.ecan = new ECAN(this.atomSpace, options.ecan || {});
    this.pln = new PLN(this.atomSpace, options.pln || {});
    this.cogServer = new CogServer(this.atomSpace, options.cogServer || {});

    // Configuration
    this.config = {
      autoStartCogServer: options.autoStartCogServer !== false,
      enablePeriodicInference: options.enablePeriodicInference !== false,
      enableAttentionAllocation: options.enableAttentionAllocation !== false,
      inferenceInterval: options.inferenceInterval || 5000, // 5 seconds
      attentionInterval: options.attentionInterval || 2000, // 2 seconds
      maxKnowledgeAge: options.maxKnowledgeAge || 3600000, // 1 hour
      knowledgeImportanceThreshold: options.knowledgeImportanceThreshold || 0.1
    };

    // Internal state
    this.isInitialized = false;
    this.knowledgeCache = new Map();
    this.contextualMemory = new Map();
    this.goalStack = [];
    
    // Periodic tasks
    this.inferenceTimer = null;
    this.attentionTimer = null;

    // Statistics
    this.stats = {
      totalKnowledgeItems: 0,
      totalInferences: 0,
      totalAttentionCycles: 0,
      averageInferenceTime: 0,
      knowledgeQuality: 0
    };

    this.initialize();
  }

  /**
   * Initialize OpenCog integration
   */
  async initialize() {
    try {
      // Start CogServer if enabled
      if (this.config.autoStartCogServer) {
        this.cogServer.start();
      }

      // Set up periodic tasks
      if (this.config.enablePeriodicInference) {
        this.startPeriodicInference();
      }

      if (this.config.enableAttentionAllocation) {
        this.startPeriodicAttention();
      }

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('OpenCog integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OpenCog integration:', error);
      throw error;
    }
  }

  /**
   * Set up event listeners for cognitive processes
   */
  setupEventListeners() {
    this.cogServer.on('jobCompleted', (job) => {
      this.updateStatsFromJob(job);
    });

    this.cogServer.on('cycleCompleted', (cycle) => {
      this.processKnowledgeDecay();
    });
  }

  /**
   * Add knowledge to the system
   */
  addKnowledge(type, content, context = {}, truthValue = null) {
    try {
      const knowledge = this.encodeKnowledge(type, content, context, truthValue);
      
      if (knowledge) {
        // Add to AtomSpace
        const atom = this.atomSpace.addAtom(knowledge);
        
        // Stimulate with attention if important
        if (context.importance > this.config.knowledgeImportanceThreshold) {
          this.ecan.stimulateAtom(atom.id, context.importance * 100);
        }

        // Cache for quick access
        this.knowledgeCache.set(this.generateKnowledgeKey(type, content), {
          atom,
          context,
          timestamp: Date.now()
        });

        this.stats.totalKnowledgeItems++;
        
        return atom;
      }
    } catch (error) {
      console.error('Error adding knowledge:', error);
    }
    
    return null;
  }

  /**
   * Encode knowledge into OpenCog atoms
   */
  encodeKnowledge(type, content, context, truthValue) {
    const tv = truthValue || new TruthValue(
      context.confidence || 0.8,
      context.strength || 0.1
    );

    switch (type) {
      case 'concept':
        return new Atom(ATOM_TYPES.CONCEPT_NODE, content, [], tv);

      case 'fact':
        return this.encodeFact(content, context, tv);

      case 'rule':
        return this.encodeRule(content, context, tv);

      case 'goal':
        return new Atom(ATOM_TYPES.GOAL_NODE, content, [], tv);

      case 'procedure':
        return new Atom(ATOM_TYPES.PROCEDURE_NODE, content, [], tv);

      case 'memory':
        return this.encodeMemory(content, context, tv);

      default:
        console.warn(`Unknown knowledge type: ${type}`);
        return null;
    }
  }

  /**
   * Encode a fact as evaluation link
   */
  encodeFact(content, context, tv) {
    const { subject, predicate, object } = this.parseFact(content);
    
    const subjectNode = this.atomSpace.addNode(ATOM_TYPES.CONCEPT_NODE, subject);
    const predicateNode = this.atomSpace.addNode(ATOM_TYPES.PREDICATE_NODE, predicate);
    const objectNode = this.atomSpace.addNode(ATOM_TYPES.CONCEPT_NODE, object);

    // Create evaluation link: (Evaluation predicate (List subject object))
    const listLink = this.atomSpace.addLink(ATOM_TYPES.LIST_LINK, [subjectNode, objectNode]);
    return this.atomSpace.addLink(ATOM_TYPES.EVALUATION_LINK, [predicateNode, listLink], tv);
  }

  /**
   * Encode a rule as implication link
   */
  encodeRule(content, context, tv) {
    const { condition, conclusion } = this.parseRule(content);
    
    const conditionAtom = this.encodeKnowledge('fact', condition, context);
    const conclusionAtom = this.encodeKnowledge('fact', conclusion, context);

    if (conditionAtom && conclusionAtom) {
      return this.atomSpace.addLink(ATOM_TYPES.IMPLICATION_LINK, [conditionAtom, conclusionAtom], tv);
    }
    
    return null;
  }

  /**
   * Encode memory based on type
   */
  encodeMemory(content, context, tv) {
    const memoryType = context.memoryType || 'episodic';
    
    switch (memoryType) {
      case 'episodic':
        return new Atom(ATOM_TYPES.EPISODIC_MEMORY_NODE, content, [], tv);
      case 'semantic':
        return new Atom(ATOM_TYPES.SEMANTIC_MEMORY_NODE, content, [], tv);
      case 'working':
        return new Atom(ATOM_TYPES.WORKING_MEMORY_NODE, content, [], tv);
      default:
        return new Atom(ATOM_TYPES.CONCEPT_NODE, content, [], tv);
    }
  }

  /**
   * Query knowledge from the system
   */
  queryKnowledge(query, options = {}) {
    try {
      const startTime = Date.now();
      
      // First check cache
      const cacheKey = this.generateQueryKey(query);
      const cached = this.knowledgeCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.config.maxKnowledgeAge) {
        return cached.result;
      }

      // Perform AtomSpace query
      const results = this.performAtomSpaceQuery(query, options);
      
      // Apply PLN reasoning if requested
      if (options.enableInference) {
        const enrichedResults = this.enrichWithInference(results, options);
        results.push(...enrichedResults);
      }

      // Filter by attention if requested
      if (options.requireAttention) {
        const attentionalResults = results.filter(atom => 
          this.atomSpace.getAttentionalFocus().includes(atom)
        );
        return attentionalResults;
      }

      // Cache results
      this.knowledgeCache.set(cacheKey, {
        result: results,
        timestamp: Date.now()
      });

      const queryTime = Date.now() - startTime;
      this.updateQueryStats(queryTime);

      return results;
    } catch (error) {
      console.error('Error querying knowledge:', error);
      return [];
    }
  }

  /**
   * Perform inference to derive new knowledge
   */
  async performInference(options = {}) {
    try {
      const startTime = Date.now();
      
      // Schedule PLN inference job
      const jobId = this.cogServer.scheduleJob('pln', {
        maxIterations: options.maxIterations || 50,
        minConfidence: options.minConfidence || 0.1
      });

      // Wait for job completion or timeout
      const result = await this.waitForJob(jobId, options.timeout || 10000);
      
      const inferenceTime = Date.now() - startTime;
      this.updateInferenceStats(result, inferenceTime);

      return result;
    } catch (error) {
      console.error('Error performing inference:', error);
      return { results: [], error: error.message };
    }
  }

  /**
   * Process goals and planning
   */
  processGoals(goals, context = {}) {
    try {
      // Add goals to AtomSpace
      const goalAtoms = goals.map(goal => 
        this.addKnowledge('goal', goal, { importance: 0.8, ...context })
      );

      // Schedule goal processing
      const jobId = this.cogServer.scheduleJob('goalProcessing', {
        goals: goalAtoms,
        context
      });

      return { jobId, goalAtoms };
    } catch (error) {
      console.error('Error processing goals:', error);
      return { error: error.message };
    }
  }

  /**
   * Integrate with LemonAI conversation context
   */
  integrateWithConversation(conversationId, messages, context = {}) {
    try {
      // Store conversation context
      this.contextualMemory.set(conversationId, {
        messages,
        context,
        timestamp: Date.now()
      });

      // Extract knowledge from messages
      const extractedKnowledge = this.extractKnowledgeFromMessages(messages);
      
      // Add to AtomSpace with conversation context
      extractedKnowledge.forEach(knowledge => {
        this.addKnowledge(
          knowledge.type,
          knowledge.content,
          { ...knowledge.context, conversationId, importance: 0.6 }
        );
      });

      // Stimulate relevant atoms
      this.stimulateRelevantAtoms(conversationId, context);

      return { extractedKnowledge: extractedKnowledge.length };
    } catch (error) {
      console.error('Error integrating with conversation:', error);
      return { error: error.message };
    }
  }

  /**
   * Get cognitive insights and recommendations
   */
  getCognitiveInsights(context = {}) {
    try {
      const insights = {
        attentionalFocus: this.getAttentionalInsights(),
        inferredKnowledge: this.getInferredKnowledge(),
        knowledgeGaps: this.identifyKnowledgeGaps(),
        recommendations: this.generateRecommendations(context),
        statistics: this.getStatistics()
      };

      return insights;
    } catch (error) {
      console.error('Error getting cognitive insights:', error);
      return { error: error.message };
    }
  }

  // Helper methods

  parseFact(content) {
    // Simple fact parsing - can be enhanced
    const parts = content.split(' ');
    return {
      subject: parts[0] || 'unknown',
      predicate: parts[1] || 'related_to',
      object: parts.slice(2).join(' ') || 'unknown'
    };
  }

  parseRule(content) {
    // Simple rule parsing - can be enhanced
    const parts = content.split(' implies ');
    return {
      condition: parts[0] || '',
      conclusion: parts[1] || ''
    };
  }

  generateKnowledgeKey(type, content) {
    return `${type}:${content}`.toLowerCase();
  }

  generateQueryKey(query) {
    return JSON.stringify(query);
  }

  performAtomSpaceQuery(query, options) {
    // Implement pattern matching and querying
    return this.atomSpace.query(query);
  }

  enrichWithInference(results, options) {
    // Apply simple inference to enrich results
    return [];
  }

  extractKnowledgeFromMessages(messages) {
    // Extract knowledge from conversation messages
    const knowledge = [];
    
    messages.forEach(message => {
      if (message.type === 'user') {
        // Extract concepts and facts from user messages
        const concepts = this.extractConcepts(message.content);
        concepts.forEach(concept => {
          knowledge.push({
            type: 'concept',
            content: concept,
            context: { source: 'user_message', confidence: 0.7 }
          });
        });
      }
    });

    return knowledge;
  }

  extractConcepts(text) {
    // Simple concept extraction - can be enhanced with NLP
    const words = text.toLowerCase().split(/\W+/);
    return words.filter(word => word.length > 3);
  }

  stimulateRelevantAtoms(conversationId, context) {
    // Stimulate atoms relevant to the current conversation
    const relevantAtoms = this.findRelevantAtoms(context);
    relevantAtoms.forEach(atom => {
      this.ecan.stimulateAtom(atom.id, 20);
    });
  }

  findRelevantAtoms(context) {
    // Find atoms relevant to current context
    return this.atomSpace.getAllAtoms().slice(0, 10); // Simple implementation
  }

  getAttentionalInsights() {
    const focus = this.atomSpace.getAttentionalFocus();
    return {
      focusSize: focus.length,
      topAtoms: focus.slice(0, 5).map(atom => ({
        type: atom.type,
        name: atom.name,
        importance: atom.getAttentionValue().getSTI()
      }))
    };
  }

  getInferredKnowledge() {
    // Get recently inferred knowledge
    const implications = this.atomSpace.getAtomsByType(ATOM_TYPES.IMPLICATION_LINK);
    return implications.slice(-10).map(link => ({
      condition: link.outgoing[0]?.name || 'unknown',
      conclusion: link.outgoing[1]?.name || 'unknown',
      strength: link.getTruthValue().getStrength()
    }));
  }

  identifyKnowledgeGaps() {
    // Identify areas with low knowledge coverage
    return ['planning', 'reasoning', 'memory']; // Simplified
  }

  generateRecommendations(context) {
    // Generate cognitive recommendations
    return [
      'Increase attention to planning-related concepts',
      'Strengthen episodic memory consolidation',
      'Apply more inference rules'
    ];
  }

  startPeriodicInference() {
    this.inferenceTimer = setInterval(() => {
      this.performInference({ maxIterations: 10 });
    }, this.config.inferenceInterval);
  }

  startPeriodicAttention() {
    this.attentionTimer = setInterval(() => {
      this.ecan.runCycle();
      this.stats.totalAttentionCycles++;
    }, this.config.attentionInterval);
  }

  processKnowledgeDecay() {
    // Remove old cached knowledge
    const now = Date.now();
    for (const [key, value] of this.knowledgeCache.entries()) {
      if (now - value.timestamp > this.config.maxKnowledgeAge) {
        this.knowledgeCache.delete(key);
      }
    }
  }

  async waitForJob(jobId, timeout) {
    return new Promise((resolve, reject) => {
      const checkJob = () => {
        const job = this.cogServer.getJob(jobId);
        if (job) {
          if (job.status === 'completed') {
            resolve(job.result);
          } else if (job.status === 'failed') {
            reject(new Error(job.error));
          } else {
            setTimeout(checkJob, 100);
          }
        } else {
          reject(new Error('Job not found'));
        }
      };

      // Use fixed safe timeout to prevent resource exhaustion
      const SAFE_TIMEOUT = 30000; // 30 seconds max
      setTimeout(() => reject(new Error('Job timeout')), SAFE_TIMEOUT);
      checkJob();
    });
  }

  updateStatsFromJob(job) {
    // Update statistics from completed jobs
    if (job.pluginId === 'pln') {
      this.stats.totalInferences += job.result?.totalInferences || 0;
    }
  }

  updateQueryStats(queryTime) {
    // Update query statistics
  }

  updateInferenceStats(result, inferenceTime) {
    this.stats.averageInferenceTime = 
      (this.stats.averageInferenceTime + inferenceTime) / 2;
  }

  getStatistics() {
    return {
      ...this.stats,
      atomSpaceSize: this.atomSpace.getSize(),
      attentionalFocusSize: this.atomSpace.getAttentionalFocus().length,
      cogServerStats: this.cogServer.getStatistics(),
      ecanStats: this.ecan.getStatistics(),
      plnStats: this.pln.getStatistics()
    };
  }

  /**
   * Shutdown OpenCog integration
   */
  shutdown() {
    if (this.inferenceTimer) {
      clearInterval(this.inferenceTimer);
    }
    
    if (this.attentionTimer) {
      clearInterval(this.attentionTimer);
    }
    
    this.cogServer.stop();
    this.isInitialized = false;
  }
}

module.exports = OpenCogIntegration;