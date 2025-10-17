/**
 * CogServer - Central cognitive processing server for OpenCog
 * Manages and schedules cognitive algorithms as plugins
 */

const EventEmitter = require('events');
const { ATOM_TYPES } = require('../atomspace/AtomTypes');

class CogServer extends EventEmitter {
  constructor(atomSpace, options = {}) {
    super();
    
    this.atomSpace = atomSpace;
    
    // Configuration
    this.config = {
      maxConcurrentJobs: options.maxConcurrentJobs || 4,
      jobTimeout: options.jobTimeout || 30000, // 30 seconds
      cycleInterval: options.cycleInterval || 1000, // 1 second
      enableScheduler: options.enableScheduler !== false,
      maxQueueSize: options.maxQueueSize || 1000
    };

    // Internal state
    this.plugins = new Map();
    this.jobQueue = [];
    this.runningJobs = new Map();
    this.completedJobs = [];
    this.isRunning = false;
    this.cycleCount = 0;
    this.scheduler = null;

    // Statistics
    this.stats = {
      totalJobsScheduled: 0,
      totalJobsCompleted: 0,
      totalJobsFailed: 0,
      averageJobDuration: 0,
      cyclesRun: 0
    };

    this.initializeBuiltinPlugins();
  }

  /**
   * Initialize built-in cognitive plugins
   */
  initializeBuiltinPlugins() {
    // PLN Plugin
    this.registerPlugin('pln', {
      name: 'Probabilistic Logic Networks',
      description: 'Performs probabilistic inference',
      execute: this.executePLNPlugin.bind(this),
      priority: 5,
      category: 'reasoning'
    });

    // ECAN Plugin
    this.registerPlugin('ecan', {
      name: 'Economic Attention Allocation',
      description: 'Manages attention allocation',
      execute: this.executeECANPlugin.bind(this),
      priority: 8,
      category: 'attention'
    });

    // Pattern Mining Plugin
    this.registerPlugin('patternMining', {
      name: 'Pattern Mining',
      description: 'Discovers frequent patterns in knowledge',
      execute: this.executePatternMiningPlugin.bind(this),
      priority: 3,
      category: 'learning'
    });

    // Goal Processing Plugin
    this.registerPlugin('goalProcessing', {
      name: 'Goal Processing',
      description: 'Processes and manages goals',
      execute: this.executeGoalProcessingPlugin.bind(this),
      priority: 7,
      category: 'planning'
    });

    // Memory Consolidation Plugin
    this.registerPlugin('memoryConsolidation', {
      name: 'Memory Consolidation',
      description: 'Consolidates important memories',
      execute: this.executeMemoryConsolidationPlugin.bind(this),
      priority: 4,
      category: 'memory'
    });
  }

  /**
   * Register a new cognitive plugin
   */
  registerPlugin(id, plugin) {
    if (!plugin.execute || typeof plugin.execute !== 'function') {
      throw new Error('Plugin must have an execute function');
    }

    this.plugins.set(id, {
      id,
      name: plugin.name || id,
      description: plugin.description || '',
      execute: plugin.execute,
      priority: plugin.priority || 1,
      category: plugin.category || 'general',
      enabled: plugin.enabled !== false,
      lastExecuted: null,
      executionCount: 0,
      averageExecutionTime: 0,
      ...plugin
    });

    this.emit('pluginRegistered', { id, plugin: this.plugins.get(id) });
    return true;
  }

  /**
   * Unregister a plugin
   */
  unregisterPlugin(id) {
    const plugin = this.plugins.get(id);
    if (plugin) {
      this.plugins.delete(id);
      this.emit('pluginUnregistered', { id, plugin });
      return true;
    }
    return false;
  }

  /**
   * Schedule a job for execution
   */
  scheduleJob(pluginId, parameters = {}, options = {}) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (!plugin.enabled) {
      throw new Error(`Plugin ${pluginId} is disabled`);
    }

    if (this.jobQueue.length >= this.config.maxQueueSize) {
      throw new Error('Job queue is full');
    }

    const job = {
      id: this.generateJobId(),
      pluginId,
      parameters,
      options: {
        priority: options.priority || plugin.priority,
        timeout: options.timeout || this.config.jobTimeout,
        maxRetries: options.maxRetries || 0,
        ...options
      },
      status: 'queued',
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      retryCount: 0,
      result: null,
      error: null
    };

    this.jobQueue.push(job);
    this.stats.totalJobsScheduled++;

    // Sort queue by priority
    this.jobQueue.sort((a, b) => b.options.priority - a.options.priority);

    this.emit('jobScheduled', job);
    return job.id;
  }

  /**
   * Start the CogServer
   */
  start() {
    if (this.isRunning) {
      return false;
    }

    this.isRunning = true;

    if (this.config.enableScheduler) {
      this.scheduler = setInterval(() => {
        this.processCycle();
      }, this.config.cycleInterval);
    }

    this.emit('started');
    return true;
  }

  /**
   * Stop the CogServer
   */
  stop() {
    if (!this.isRunning) {
      return false;
    }

    this.isRunning = false;

    if (this.scheduler) {
      clearInterval(this.scheduler);
      this.scheduler = null;
    }

    // Wait for running jobs to complete or timeout
    const runningJobIds = Array.from(this.runningJobs.keys());
    runningJobIds.forEach(jobId => {
      this.cancelJob(jobId);
    });

    this.emit('stopped');
    return true;
  }

  /**
   * Process one cognitive cycle
   */
  processCycle() {
    this.cycleCount++;
    this.stats.cyclesRun++;

    // Start new jobs if capacity allows
    while (this.runningJobs.size < this.config.maxConcurrentJobs && this.jobQueue.length > 0) {
      const job = this.jobQueue.shift();
      this.executeJob(job);
    }

    // Check for timed out jobs
    this.checkTimeouts();

    this.emit('cycleCompleted', {
      cycle: this.cycleCount,
      queueSize: this.jobQueue.length,
      runningJobs: this.runningJobs.size
    });
  }

  /**
   * Execute a job
   */
  async executeJob(job) {
    const plugin = this.plugins.get(job.pluginId);
    if (!plugin) {
      this.failJob(job, new Error(`Plugin ${job.pluginId} not found`));
      return;
    }

    job.status = 'running';
    job.startedAt = Date.now();
    this.runningJobs.set(job.id, job);

    this.emit('jobStarted', job);

    try {
      // Use fixed safe timeout to prevent resource exhaustion  
      const SAFE_TIMEOUT = 30000; // 30 seconds max
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Job timed out')), SAFE_TIMEOUT);
      });

      // Execute plugin
      const executionPromise = plugin.execute(this.atomSpace, job.parameters, job.options);

      // Race between execution and timeout
      const result = await Promise.race([executionPromise, timeoutPromise]);

      this.completeJob(job, result);
    } catch (error) {
      if (job.retryCount < job.options.maxRetries) {
        this.retryJob(job, error);
      } else {
        this.failJob(job, error);
      }
    }
  }

  /**
   * Complete a job successfully
   */
  completeJob(job, result) {
    job.status = 'completed';
    job.completedAt = Date.now();
    job.result = result;

    const duration = job.completedAt - job.startedAt;
    
    // Update plugin statistics
    const plugin = this.plugins.get(job.pluginId);
    if (plugin) {
      plugin.executionCount++;
      plugin.lastExecuted = job.completedAt;
      plugin.averageExecutionTime = 
        (plugin.averageExecutionTime * (plugin.executionCount - 1) + duration) / plugin.executionCount;
    }

    this.runningJobs.delete(job.id);
    this.completedJobs.push(job);
    this.stats.totalJobsCompleted++;

    // Update average job duration
    this.stats.averageJobDuration = 
      (this.stats.averageJobDuration * (this.stats.totalJobsCompleted - 1) + duration) / 
      this.stats.totalJobsCompleted;

    this.emit('jobCompleted', job);
  }

  /**
   * Fail a job
   */
  failJob(job, error) {
    job.status = 'failed';
    job.completedAt = Date.now();
    job.error = error.message || error;

    this.runningJobs.delete(job.id);
    this.completedJobs.push(job);
    this.stats.totalJobsFailed++;

    this.emit('jobFailed', job);
  }

  /**
   * Retry a job
   */
  retryJob(job, error) {
    job.retryCount++;
    job.status = 'queued';
    job.error = error.message || error;

    this.runningJobs.delete(job.id);
    this.jobQueue.push(job);

    // Sort queue by priority
    this.jobQueue.sort((a, b) => b.options.priority - a.options.priority);

    this.emit('jobRetried', job);
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId) {
    const job = this.runningJobs.get(jobId);
    if (job) {
      job.status = 'cancelled';
      job.completedAt = Date.now();
      this.runningJobs.delete(jobId);
      this.completedJobs.push(job);
      this.emit('jobCancelled', job);
      return true;
    }
    return false;
  }

  /**
   * Check for timed out jobs
   */
  checkTimeouts() {
    const now = Date.now();
    const timedOutJobs = [];

    for (const [jobId, job] of this.runningJobs) {
      if (now - job.startedAt > job.options.timeout) {
        timedOutJobs.push(job);
      }
    }

    timedOutJobs.forEach(job => {
      this.failJob(job, new Error('Job timed out'));
    });
  }

  /**
   * Generate unique job ID
   */
  generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get job by ID
   */
  getJob(jobId) {
    // Check running jobs
    if (this.runningJobs.has(jobId)) {
      return this.runningJobs.get(jobId);
    }

    // Check queued jobs
    const queuedJob = this.jobQueue.find(job => job.id === jobId);
    if (queuedJob) {
      return queuedJob;
    }

    // Check completed jobs
    const completedJob = this.completedJobs.find(job => job.id === jobId);
    return completedJob || null;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      currentCycle: this.cycleCount,
      queueSize: this.jobQueue.length,
      runningJobs: this.runningJobs.size,
      totalPlugins: this.plugins.size,
      enabledPlugins: Array.from(this.plugins.values()).filter(p => p.enabled).length
    };
  }

  /**
   * Get plugin information
   */
  getPlugins() {
    return Array.from(this.plugins.values());
  }

  // Built-in plugin implementations

  async executePLNPlugin(atomSpace, parameters, options) {
    const PLN = require('../pln/PLN');
    const pln = new PLN(atomSpace, parameters);
    return await pln.performInference(parameters.maxIterations || 10);
  }

  async executeECANPlugin(atomSpace, parameters, options) {
    const ECAN = require('../ecan/ECAN');
    const ecan = new ECAN(atomSpace, parameters);
    ecan.runCycle();
    return ecan.getStatistics();
  }

  async executePatternMiningPlugin(atomSpace, parameters, options) {
    // Simple pattern mining implementation
    const patterns = [];
    const atoms = atomSpace.getAllAtoms();
    
    // Find common subgraphs
    const nodeTypes = {};
    atoms.forEach(atom => {
      if (atom.isNode()) {
        nodeTypes[atom.type] = (nodeTypes[atom.type] || 0) + 1;
      }
    });

    // Return frequent node types as patterns
    for (const [type, count] of Object.entries(nodeTypes)) {
      if (count >= (parameters.minSupport || 2)) {
        patterns.push({
          type: 'frequent_node_type',
          pattern: type,
          support: count
        });
      }
    }

    return { patterns, totalPatterns: patterns.length };
  }

  async executeGoalProcessingPlugin(atomSpace, parameters, options) {
    const goals = atomSpace.getAtomsByType(ATOM_TYPES.GOAL_NODE);
    const processedGoals = [];

    for (const goal of goals) {
      const importance = goal.getAttentionValue().getSTI();
      if (importance > (parameters.minImportance || 0)) {
        processedGoals.push({
          goal: goal.name,
          importance,
          status: 'active'
        });
      }
    }

    return { processedGoals, totalGoals: goals.length };
  }

  async executeMemoryConsolidationPlugin(atomSpace, parameters, options) {
    const consolidatedCount = 0;
    const atoms = atomSpace.getAllAtoms();
    
    // Simple consolidation: increase LTI for frequently accessed atoms
    atoms.forEach(atom => {
      const av = atom.getAttentionValue();
      if (av.getSTI() > (parameters.stiThreshold || 50)) {
        av.setLTI(av.getLTI() + 1);
      }
    });

    return { consolidatedAtoms: consolidatedCount };
  }
}

module.exports = CogServer;