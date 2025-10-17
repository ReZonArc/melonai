/**
 * OpenCog API Router
 * Exposes OpenCog functionality through REST API endpoints
 */

const Router = require('koa-router');
const { OpenCogFactory, OpenCogUtils, ATOM_TYPES } = require('../opencog');

const router = new Router({
  prefix: '/api/opencog'
});

// Store active OpenCog instances per conversation
const openCogInstances = new Map();

/**
 * Get or create OpenCog instance for conversation
 */
function getOpenCogInstance(conversationId, options = {}) {
  if (!openCogInstances.has(conversationId)) {
    const instance = OpenCogFactory.createOpenCogSystem({
      autoStartCogServer: true,
      enablePeriodicInference: true,
      enableAttentionAllocation: true,
      ...options
    });
    openCogInstances.set(conversationId, instance);
  }
  return openCogInstances.get(conversationId);
}

/**
 * @swagger
 * /api/opencog/status:
 *   get:
 *     summary: Get OpenCog system status
 *     tags: [OpenCog]
 *     responses:
 *       200:
 *         description: OpenCog system status
 */
router.get('/status', async (ctx) => {
  try {
    const { conversation_id } = ctx.query;
    
    if (conversation_id && openCogInstances.has(conversation_id)) {
      const openCog = openCogInstances.get(conversation_id);
      const stats = openCog.getStatistics();
      
      ctx.body = {
        success: true,
        status: 'active',
        conversationId: conversation_id,
        statistics: stats
      };
    } else {
      ctx.body = {
        success: true,
        status: 'inactive',
        totalInstances: openCogInstances.size,
        availableCapabilities: [
          'probabilistic_reasoning',
          'attention_allocation',
          'knowledge_integration',
          'cognitive_reflection'
        ]
      };
    }
  } catch (error) {
    ctx.status = 500;
    ctx.body = { success: false, error: error.message };
  }
});

/**
 * @swagger
 * /api/opencog/knowledge:
 *   post:
 *     summary: Add knowledge to OpenCog system
 *     tags: [OpenCog]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conversation_id:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [concept, fact, rule, goal, procedure, memory]
 *               content:
 *                 type: string
 *               context:
 *                 type: object
 *                 properties:
 *                   importance:
 *                     type: number
 *                   confidence:
 *                     type: number
 *                   strength:
 *                     type: number
 *     responses:
 *       200:
 *         description: Knowledge added successfully
 */
router.post('/knowledge', async (ctx) => {
  try {
    const { conversation_id, type, content, context = {} } = ctx.request.body;
    
    if (!conversation_id || !type || !content) {
      ctx.status = 400;
      ctx.body = { success: false, error: 'Missing required fields: conversation_id, type, content' };
      return;
    }

    const openCog = getOpenCogInstance(conversation_id);
    const atom = openCog.addKnowledge(type, content, context);

    if (atom) {
      ctx.body = {
        success: true,
        atomId: atom.id,
        type: atom.type,
        truthValue: atom.getTruthValue().toJSON(),
        attentionValue: atom.getAttentionValue().toJSON()
      };
    } else {
      ctx.status = 400;
      ctx.body = { success: false, error: 'Failed to create knowledge atom' };
    }
  } catch (error) {
    ctx.status = 500;
    ctx.body = { success: false, error: error.message };
  }
});

/**
 * @swagger
 * /api/opencog/query:
 *   post:
 *     summary: Query knowledge from OpenCog system
 *     tags: [OpenCog]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conversation_id:
 *                 type: string
 *               query:
 *                 type: object
 *               options:
 *                 type: object
 *                 properties:
 *                   enableInference:
 *                     type: boolean
 *                   requireAttention:
 *                     type: boolean
 *                   maxResults:
 *                     type: number
 *     responses:
 *       200:
 *         description: Query results
 */
router.post('/query', async (ctx) => {
  try {
    const { conversation_id, query, options = {} } = ctx.request.body;
    
    if (!conversation_id || !query) {
      ctx.status = 400;
      ctx.body = { success: false, error: 'Missing required fields: conversation_id, query' };
      return;
    }

    const openCog = getOpenCogInstance(conversation_id);
    const results = openCog.queryKnowledge(query, options);

    const formattedResults = results.slice(0, options.maxResults || 50).map(atom => ({
      id: atom.id,
      type: atom.type,
      name: atom.name,
      description: OpenCogUtils.describeAtom(atom),
      truthValue: atom.getTruthValue().toJSON(),
      attentionValue: atom.getAttentionValue().toJSON(),
      timestamp: atom.timestamp
    }));

    ctx.body = {
      success: true,
      results: formattedResults,
      totalFound: results.length,
      query,
      options
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { success: false, error: error.message };
  }
});

/**
 * @swagger
 * /api/opencog/inference:
 *   post:
 *     summary: Perform probabilistic inference
 *     tags: [OpenCog]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conversation_id:
 *                 type: string
 *               options:
 *                 type: object
 *                 properties:
 *                   maxIterations:
 *                     type: number
 *                   minConfidence:
 *                     type: number
 *                   timeout:
 *                     type: number
 *     responses:
 *       200:
 *         description: Inference results
 */
router.post('/inference', async (ctx) => {
  try {
    const { conversation_id, options = {} } = ctx.request.body;
    
    if (!conversation_id) {
      ctx.status = 400;
      ctx.body = { success: false, error: 'Missing required field: conversation_id' };
      return;
    }

    const openCog = getOpenCogInstance(conversation_id);
    const results = await openCog.performInference(options);

    const formattedResults = results.results ? results.results.map(inference => ({
      rule: inference.rule,
      premises: inference.premises ? inference.premises.map(p => OpenCogUtils.describeAtom(p)) : [],
      conclusion: inference.conclusion ? OpenCogUtils.describeAtom(inference.conclusion) : null,
      truthValue: inference.truthValue ? inference.truthValue.toJSON() : null
    })) : [];

    ctx.body = {
      success: true,
      inference: {
        results: formattedResults,
        iterations: results.iterations,
        totalInferences: results.totalInferences
      },
      statistics: openCog.getStatistics()
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { success: false, error: error.message };
  }
});

/**
 * @swagger
 * /api/opencog/attention:
 *   get:
 *     summary: Get attentional focus information
 *     tags: [OpenCog]
 *     parameters:
 *       - in: query
 *         name: conversation_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attentional focus information
 */
router.get('/attention', async (ctx) => {
  try {
    const { conversation_id } = ctx.query;
    
    if (!conversation_id) {
      ctx.status = 400;
      ctx.body = { success: false, error: 'Missing required parameter: conversation_id' };
      return;
    }

    const openCog = getOpenCogInstance(conversation_id);
    const attentionalFocus = openCog.atomSpace.getAttentionalFocus();
    
    const focusAtoms = attentionalFocus.map(atom => ({
      id: atom.id,
      type: atom.type,
      name: atom.name,
      description: OpenCogUtils.describeAtom(atom),
      sti: atom.getAttentionValue().getSTI(),
      lti: atom.getAttentionValue().getLTI(),
      vlti: atom.getAttentionValue().getVLTI()
    }));

    const ecanStats = openCog.ecan.getStatistics();

    ctx.body = {
      success: true,
      attentionalFocus: {
        atoms: focusAtoms,
        size: focusAtoms.length,
        maxSize: openCog.ecan.config.maxAF
      },
      ecanStatistics: ecanStats
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { success: false, error: error.message };
  }
});

/**
 * @swagger
 * /api/opencog/attention/stimulate:
 *   post:
 *     summary: Stimulate atoms with attention
 *     tags: [OpenCog]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conversation_id:
 *                 type: string
 *               atom_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Stimulation results
 */
router.post('/attention/stimulate', async (ctx) => {
  try {
    const { conversation_id, atom_ids, amount = 10 } = ctx.request.body;
    
    if (!conversation_id || !atom_ids || !Array.isArray(atom_ids)) {
      ctx.status = 400;
      ctx.body = { success: false, error: 'Missing required fields: conversation_id, atom_ids (array)' };
      return;
    }

    const openCog = getOpenCogInstance(conversation_id);
    const results = [];

    for (const atomId of atom_ids) {
      const success = openCog.ecan.stimulateAtom(atomId, amount);
      results.push({ atomId, success });
    }

    ctx.body = {
      success: true,
      stimulationResults: results,
      totalStimulated: results.filter(r => r.success).length
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { success: false, error: error.message };
  }
});

/**
 * @swagger
 * /api/opencog/insights:
 *   get:
 *     summary: Get cognitive insights and recommendations
 *     tags: [OpenCog]
 *     parameters:
 *       - in: query
 *         name: conversation_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cognitive insights
 */
router.get('/insights', async (ctx) => {
  try {
    const { conversation_id } = ctx.query;
    
    if (!conversation_id) {
      ctx.status = 400;
      ctx.body = { success: false, error: 'Missing required parameter: conversation_id' };
      return;
    }

    const openCog = getOpenCogInstance(conversation_id);
    const insights = openCog.getCognitiveInsights({ conversationId: conversation_id });

    ctx.body = {
      success: true,
      insights,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { success: false, error: error.message };
  }
});

/**
 * @swagger
 * /api/opencog/conversation/integrate:
 *   post:
 *     summary: Integrate conversation with OpenCog
 *     tags: [OpenCog]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conversation_id:
 *                 type: string
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                     content:
 *                       type: string
 *                     timestamp:
 *                       type: number
 *               context:
 *                 type: object
 *     responses:
 *       200:
 *         description: Integration results
 */
router.post('/conversation/integrate', async (ctx) => {
  try {
    const { conversation_id, messages, context = {} } = ctx.request.body;
    
    if (!conversation_id || !messages || !Array.isArray(messages)) {
      ctx.status = 400;
      ctx.body = { success: false, error: 'Missing required fields: conversation_id, messages (array)' };
      return;
    }

    const openCog = getOpenCogInstance(conversation_id);
    const results = openCog.integrateWithConversation(conversation_id, messages, context);

    ctx.body = {
      success: true,
      integration: results,
      knowledgeExtracted: results.extractedKnowledge || 0,
      conversationId: conversation_id
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { success: false, error: error.message };
  }
});

/**
 * @swagger
 * /api/opencog/atomspace:
 *   get:
 *     summary: Get AtomSpace information
 *     tags: [OpenCog]
 *     parameters:
 *       - in: query
 *         name: conversation_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: AtomSpace information
 */
router.get('/atomspace', async (ctx) => {
  try {
    const { conversation_id } = ctx.query;
    
    if (!conversation_id) {
      ctx.status = 400;
      ctx.body = { success: false, error: 'Missing required parameter: conversation_id' };
      return;
    }

    const openCog = getOpenCogInstance(conversation_id);
    const stats = openCog.atomSpace.getStatistics();

    ctx.body = {
      success: true,
      atomSpace: {
        size: stats.totalAtoms,
        nodeCount: stats.nodeCount,
        linkCount: stats.linkCount,
        typeDistribution: stats.typeDistribution,
        attentionalFocusSize: stats.attentionalFocusSize
      },
      availableTypes: Object.keys(ATOM_TYPES)
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { success: false, error: error.message };
  }
});

/**
 * @swagger
 * /api/opencog/cleanup:
 *   delete:
 *     summary: Cleanup OpenCog instance for conversation
 *     tags: [OpenCog]
 *     parameters:
 *       - in: query
 *         name: conversation_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cleanup successful
 */
router.delete('/cleanup', async (ctx) => {
  try {
    const { conversation_id } = ctx.query;
    
    if (!conversation_id) {
      ctx.status = 400;
      ctx.body = { success: false, error: 'Missing required parameter: conversation_id' };
      return;
    }

    if (openCogInstances.has(conversation_id)) {
      const openCog = openCogInstances.get(conversation_id);
      openCog.shutdown();
      openCogInstances.delete(conversation_id);
      
      ctx.body = {
        success: true,
        message: `OpenCog instance for conversation ${conversation_id} cleaned up`
      };
    } else {
      ctx.body = {
        success: true,
        message: `No OpenCog instance found for conversation ${conversation_id}`
      };
    }
  } catch (error) {
    ctx.status = 500;
    ctx.body = { success: false, error: error.message };
  }
});

// Cleanup function for server shutdown
function cleanup() {
  for (const [conversationId, openCog] of openCogInstances) {
    try {
      openCog.shutdown();
    } catch (error) {
      console.error(`Error cleaning up OpenCog instance ${conversationId}:`, error);
    }
  }
  openCogInstances.clear();
}

// Export cleanup function for server shutdown
router.cleanup = cleanup;

module.exports = router;