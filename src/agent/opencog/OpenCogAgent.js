/**
 * OpenCogAgent - Enhanced AgenticAgent with OpenCog cognitive capabilities
 * Extends LemonAI's AgenticAgent to include advanced cognitive reasoning
 */

const AgenticAgent = require('../AgenticAgent');
const OpenCogIntegration = require('../../opencog/OpenCogIntegration');
const { ATOM_TYPES } = require('../../opencog/atomspace/AtomTypes');
const { TruthValue } = require('../../opencog/atomspace/Atom');

class OpenCogAgent extends AgenticAgent {
  constructor(context = {}) {
    super(context);
    
    // Initialize OpenCog integration
    this.openCog = new OpenCogIntegration({
      autoStartCogServer: true,
      enablePeriodicInference: true,
      enableAttentionAllocation: true,
      inferenceInterval: 10000, // 10 seconds
      attentionInterval: 5000,   // 5 seconds
      ...context.openCogConfig
    });

    // OpenCog-specific context
    this.cognitiveContext = {
      conversationKnowledge: new Map(),
      goalHierarchy: [],
      inferenceHistory: [],
      attentionFocus: [],
      memoryConsolidation: new Map()
    };

    // Enhanced capabilities flags
    this.capabilities = {
      ...this.capabilities,
      probabilisticReasoning: true,
      attentionAllocation: true,
      knowledgeIntegration: true,
      cognitiveReflection: true,
      goalHierarchyPlanning: true
    };
  }

  /**
   * Enhanced goal setting with OpenCog knowledge integration
   */
  setGoal(goal) {
    super.setGoal(goal);
    
    // Add goal to OpenCog knowledge base
    this.openCog.addKnowledge('goal', goal, {
      importance: 0.9,
      confidence: 0.8,
      source: 'user_input',
      timestamp: Date.now()
    });

    // Extract sub-goals and add to hierarchy
    const subGoals = this.extractSubGoals(goal);
    this.cognitiveContext.goalHierarchy = subGoals;
    
    // Stimulate goal-related concepts
    this.stimulateGoalConcepts(goal);
  }

  /**
   * Enhanced planning with OpenCog probabilistic reasoning
   */
  async plan(goal = '') {
    try {
      // First, perform traditional planning
      const traditionalPlan = await super.plan(goal);

      // Enhance with OpenCog cognitive capabilities
      await this.enhancePlanWithCognition(goal);

      // Perform probabilistic reasoning on the plan
      const inferenceResults = await this.openCog.performInference({
        maxIterations: 30,
        minConfidence: 0.2
      });

      // Integrate inference results into planning
      if (inferenceResults.results && inferenceResults.results.length > 0) {
        await this.integrateCognitiveInsights(inferenceResults);
      }

      // Update attention allocation based on plan
      this.updateAttentionForPlan();

      return traditionalPlan;
    } catch (error) {
      global.logging(this.context, 'OpenCogAgent.plan', 'error', error);
      // Fallback to traditional planning
      return await super.plan(goal);
    }
  }

  /**
   * Enhanced task execution with cognitive monitoring
   */
  async run_loop() {
    const loggerKey = 'OpenCogAgent.run_loop';
    const manager = this.taskManager;
    
    while (true) {
      const task = await manager.resolvePendingTask();
      if (!task) {
        global.logging(this.context, loggerKey, '====== no task ======');
        return;
      }

      global.logging(this.context, loggerKey, task);
      this.context.task = task;

      // Add task knowledge to OpenCog
      await this.addTaskKnowledge(task);

      // Perform cognitive reflection before execution
      const cognitiveContext = await this.performCognitiveReflection(task);

      try {
        // Enhanced execution with cognitive context
        const result = await this.executeCognitiveTask(task, cognitiveContext);
        
        global.logging(this.context, loggerKey, result);
        
        if (result.status === 'failure') {
          await this.handle_task_status(task, 'failed', {
            content: result.comments,
            memorized: result.memorized || '',
            comments: result.comments,
          });
          await Conversation.update({ status: 'failed' }, { where: { conversation_id: this.context.conversation_id } });
          await this.stop();
          return;
        }
        
        if (result.status === 'revise_plan') {
          // Use cognitive insights for plan revision
          const revisedPlan = await this.cognitivelyRevisePlan(task, result);
          await this.handle_task_status(task, 'revise_plan', {
            content: result.content || '',
            memorized: result.memorized || '',
            params: revisedPlan.params || result.params || {}
          });
          continue;
        }
        
        // Store successful execution knowledge
        await this.storeExecutionKnowledge(task, result);
        
        await this.handle_task_status(task, 'completed', {
          content: result.content,
          memorized: result.memorized || ''
        });
        
      } catch (error) {
        // Learn from errors using OpenCog
        await this.learnFromError(task, error);
        
        await this.handle_task_status(task, 'failed', { error: error.message });
        global.logging(this.context, loggerKey, error);
        global.safeExit && await global.safeExit(0);
      }
    }
  }

  /**
   * Add task-related knowledge to OpenCog
   */
  async addTaskKnowledge(task) {
    try {
      // Add task as a concept
      this.openCog.addKnowledge('concept', `task_${task.id}`, {
        importance: 0.8,
        confidence: 0.9,
        taskType: task.type,
        requirement: task.requirement
      });

      // Add task requirements as facts
      if (task.requirement) {
        this.openCog.addKnowledge('fact', `task_${task.id} requires ${task.requirement}`, {
          importance: 0.7,
          confidence: 0.8
        });
      }

      // Add tools as related concepts
      if (task.tools && task.tools.length > 0) {
        task.tools.forEach(tool => {
          this.openCog.addKnowledge('concept', `tool_${tool}`, {
            importance: 0.6,
            confidence: 0.7
          });
          
          this.openCog.addKnowledge('fact', `task_${task.id} uses tool_${tool}`, {
            importance: 0.5,
            confidence: 0.6
          });
        });
      }

    } catch (error) {
      console.error('Error adding task knowledge:', error);
    }
  }

  /**
   * Perform cognitive reflection before task execution
   */
  async performCognitiveReflection(task) {
    try {
      // Query relevant knowledge
      const relevantKnowledge = this.openCog.queryKnowledge({
        type: ATOM_TYPES.CONCEPT_NODE,
        name: `task_${task.id}`
      }, {
        enableInference: true,
        requireAttention: false
      });

      // Get cognitive insights
      const insights = this.openCog.getCognitiveInsights({
        taskContext: task,
        conversationId: this.context.conversation_id
      });

      // Generate cognitive context
      const cognitiveContext = {
        relevantKnowledge,
        insights,
        attentionalFocus: insights.attentionalFocus,
        recommendations: insights.recommendations,
        confidence: this.calculateTaskConfidence(task, insights)
      };

      return cognitiveContext;
    } catch (error) {
      console.error('Error in cognitive reflection:', error);
      return { confidence: 0.5 };
    }
  }

  /**
   * Execute task with cognitive enhancement
   */
  async executeCognitiveTask(task, cognitiveContext) {
    const completeCodeAct = require("../code-act/code-act.js");
    
    // Enhance context with cognitive information
    const enhancedContext = {
      ...this.context,
      cognitiveContext,
      openCogInsights: cognitiveContext.insights,
      taskConfidence: cognitiveContext.confidence
    };

    // Execute with enhanced context
    const result = await completeCodeAct(task, enhancedContext);

    // Add cognitive metadata to result
    if (result) {
      result.cognitiveMetadata = {
        confidence: cognitiveContext.confidence,
        attentionLevel: this.calculateAttentionLevel(task),
        inferenceUsed: cognitiveContext.insights?.inferredKnowledge?.length > 0
      };
    }

    return result;
  }

  /**
   * Enhance plan with cognitive capabilities
   */
  async enhancePlanWithCognition(goal) {
    try {
      // Integrate conversation context with OpenCog
      const conversationId = this.context.conversation_id;
      const messages = this.context.messages || [];
      
      const integration = this.openCog.integrateWithConversation(
        conversationId,
        messages,
        { goal, planningPhase: true }
      );

      // Add planning knowledge
      this.openCog.addKnowledge('procedure', `planning_for_${goal}`, {
        importance: 0.8,
        confidence: 0.7,
        phase: 'planning',
        conversationId
      });

      // Process goals with hierarchy
      if (this.cognitiveContext.goalHierarchy.length > 0) {
        this.openCog.processGoals(this.cognitiveContext.goalHierarchy, {
          mainGoal: goal,
          importance: 0.9
        });
      }

    } catch (error) {
      console.error('Error enhancing plan with cognition:', error);
    }
  }

  /**
   * Integrate cognitive insights into planning
   */
  async integrateCognitiveInsights(inferenceResults) {
    try {
      // Process inference results
      for (const inference of inferenceResults.results) {
        if (inference.rule === 'deduction' && inference.truthValue.getConfidence() > 0.3) {
          // Add inferred knowledge to planning context
          this.cognitiveContext.inferenceHistory.push({
            type: inference.rule,
            premises: inference.premises.map(p => p.toString()),
            conclusion: inference.conclusion.toString(),
            confidence: inference.truthValue.getConfidence(),
            timestamp: Date.now()
          });
        }
      }

      // Update task priorities based on inferences
      if (this.taskManager && this.cognitiveContext.inferenceHistory.length > 0) {
        await this.updateTaskPrioritiesFromInferences();
      }

    } catch (error) {
      console.error('Error integrating cognitive insights:', error);
    }
  }

  /**
   * Cognitively revise plan based on task feedback
   */
  async cognitivelyRevisePlan(task, result) {
    try {
      // Add failure knowledge
      this.openCog.addKnowledge('fact', `task_${task.id} needs_revision`, {
        importance: 0.8,
        confidence: 0.9,
        reason: result.comments || 'revision_needed'
      });

      // Perform inference to suggest improvements
      const inferenceResults = await this.openCog.performInference({
        maxIterations: 20,
        minConfidence: 0.2
      });

      // Extract revision insights
      const revisionInsights = this.extractRevisionInsights(inferenceResults);

      return {
        params: result.params || {},
        cognitiveInsights: revisionInsights,
        confidence: this.calculateRevisionConfidence(revisionInsights)
      };

    } catch (error) {
      console.error('Error in cognitive plan revision:', error);
      return { params: result.params || {} };
    }
  }

  /**
   * Store execution knowledge for future use
   */
  async storeExecutionKnowledge(task, result) {
    try {
      // Store successful execution pattern
      this.openCog.addKnowledge('fact', `task_${task.id} succeeded`, {
        importance: 0.7,
        confidence: 0.8,
        executionTime: Date.now(),
        result: result.content || 'success'
      });

      // Store tool effectiveness
      if (task.tools) {
        task.tools.forEach(tool => {
          this.openCog.addKnowledge('fact', `tool_${tool} effective_for task_${task.id}`, {
            importance: 0.6,
            confidence: 0.7
          });
        });
      }

      // Strengthen memory consolidation
      const taskAtoms = this.openCog.queryKnowledge({
        type: ATOM_TYPES.CONCEPT_NODE,
        name: `task_${task.id}`
      });

      // Stimulate successful task atoms
      taskAtoms.forEach(atom => {
        this.openCog.ecan.stimulateAtom(atom.id, 15);
      });

    } catch (error) {
      console.error('Error storing execution knowledge:', error);
    }
  }

  /**
   * Learn from errors using OpenCog
   */
  async learnFromError(task, error) {
    try {
      // Add error knowledge
      this.openCog.addKnowledge('fact', `task_${task.id} failed`, {
        importance: 0.8,
        confidence: 0.9,
        error: error.message || 'unknown_error',
        timestamp: Date.now()
      });

      // Add causal relationships
      if (task.tools) {
        task.tools.forEach(tool => {
          this.openCog.addKnowledge('fact', `tool_${tool} caused_error_in task_${task.id}`, {
            importance: 0.5,
            confidence: 0.6
          });
        });
      }

      // Perform inference to identify patterns
      setTimeout(async () => {
        await this.openCog.performInference({
          maxIterations: 15,
          minConfidence: 0.1
        });
      }, 1000);

    } catch (learningError) {
      console.error('Error learning from error:', learningError);
    }
  }

  // Helper methods for cognitive processing

  extractSubGoals(goal) {
    // Simple sub-goal extraction - can be enhanced with NLP
    const subGoals = [];
    const keywords = ['create', 'build', 'implement', 'design', 'develop'];
    
    keywords.forEach(keyword => {
      if (goal.toLowerCase().includes(keyword)) {
        subGoals.push(`${keyword}_component`);
      }
    });

    return subGoals.length > 0 ? subGoals : [goal];
  }

  stimulateGoalConcepts(goal) {
    // Extract and stimulate goal-related concepts
    const concepts = this.openCog.extractConcepts(goal);
    concepts.forEach(concept => {
      const conceptAtoms = this.openCog.queryKnowledge({
        type: ATOM_TYPES.CONCEPT_NODE,
        name: concept
      });
      
      conceptAtoms.forEach(atom => {
        this.openCog.ecan.stimulateAtom(atom.id, 25);
      });
    });
  }

  updateAttentionForPlan() {
    // Update attention allocation based on current planning phase
    const planningAtoms = this.openCog.queryKnowledge({
      type: ATOM_TYPES.PROCEDURE_NODE
    });

    planningAtoms.forEach(atom => {
      if (atom.name && atom.name.includes('planning')) {
        this.openCog.ecan.stimulateAtom(atom.id, 20);
      }
    });
  }

  calculateTaskConfidence(task, insights) {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on relevant knowledge
    if (insights.attentionalFocus && insights.attentionalFocus.focusSize > 0) {
      confidence += 0.2;
    }

    // Increase confidence based on inferred knowledge
    if (insights.inferredKnowledge && insights.inferredKnowledge.length > 0) {
      confidence += 0.1;
    }

    // Decrease confidence based on knowledge gaps
    if (insights.knowledgeGaps && insights.knowledgeGaps.length > 2) {
      confidence -= 0.1;
    }

    return Math.max(0.1, Math.min(0.9, confidence));
  }

  calculateAttentionLevel(task) {
    const taskAtoms = this.openCog.queryKnowledge({
      type: ATOM_TYPES.CONCEPT_NODE,
      name: `task_${task.id}`
    });

    if (taskAtoms.length === 0) return 0;

    const totalSTI = taskAtoms.reduce((sum, atom) => 
      sum + atom.getAttentionValue().getSTI(), 0
    );

    return totalSTI / taskAtoms.length;
  }

  async updateTaskPrioritiesFromInferences() {
    // Update task priorities based on cognitive inferences
    const tasks = this.taskManager.getTasks();
    
    for (const task of tasks) {
      if (task.status === 'pending') {
        const taskKnowledge = this.openCog.queryKnowledge({
          type: ATOM_TYPES.CONCEPT_NODE,
          name: `task_${task.id}`
        });

        if (taskKnowledge.length > 0) {
          const avgImportance = taskKnowledge.reduce((sum, atom) => 
            sum + atom.getAttentionValue().getSTI(), 0
          ) / taskKnowledge.length;

          // Adjust task priority based on cognitive importance
          if (avgImportance > 50) {
            task.priority = (task.priority || 1) + 1;
          }
        }
      }
    }
  }

  extractRevisionInsights(inferenceResults) {
    const insights = {
      suggestedChanges: [],
      alternativeApproaches: [],
      riskFactors: []
    };

    if (inferenceResults.results) {
      inferenceResults.results.forEach(inference => {
        if (inference.rule === 'abduction') {
          insights.alternativeApproaches.push(inference.conclusion.toString());
        } else if (inference.rule === 'induction') {
          insights.suggestedChanges.push(inference.conclusion.toString());
        }
      });
    }

    return insights;
  }

  calculateRevisionConfidence(insights) {
    let confidence = 0.3; // Base revision confidence

    if (insights.suggestedChanges.length > 0) {
      confidence += 0.2;
    }

    if (insights.alternativeApproaches.length > 0) {
      confidence += 0.3;
    }

    return Math.min(0.8, confidence);
  }

  /**
   * Get OpenCog statistics and insights
   */
  getOpenCogStats() {
    return this.openCog.getStatistics();
  }

  /**
   * Enhanced stop method with OpenCog cleanup
   */
  async stop() {
    await super.stop();
    
    // Shutdown OpenCog integration
    if (this.openCog) {
      this.openCog.shutdown();
    }
  }
}

module.exports = OpenCogAgent;