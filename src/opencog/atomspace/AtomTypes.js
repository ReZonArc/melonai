/**
 * AtomTypes - Definition of all atom types in OpenCog
 * Provides standardized atom types for consistent knowledge representation
 */

// Basic Node Types
const NODE_TYPES = {
  // Concept and Entity Nodes
  CONCEPT_NODE: 'ConceptNode',
  PREDICATE_NODE: 'PredicateNode',
  SCHEMA_NODE: 'SchemaNode',
  PROCEDURE_NODE: 'ProcedureNode',
  GROUNDED_PREDICATE_NODE: 'GroundedPredicateNode',
  GROUNDED_SCHEMA_NODE: 'GroundedSchemaNode',
  
  // Variable Nodes
  VARIABLE_NODE: 'VariableNode',
  TYPED_VARIABLE_NODE: 'TypedVariableNode',
  
  // Numeric Nodes
  NUMBER_NODE: 'NumberNode',
  
  // Text Nodes
  WORD_NODE: 'WordNode',
  DOCUMENT_NODE: 'DocumentNode',
  SENTENCE_NODE: 'SentenceNode',
  PHRASE_NODE: 'PhraseNode',
  
  // Anchored Nodes
  ANCHOR_NODE: 'AnchorNode',
  
  // Type Nodes
  TYPE_NODE: 'TypeNode',
  TYPE_INH_NODE: 'TypeInhNode',
  
  // Context Nodes
  CONTEXT_NODE: 'ContextNode',
  
  // Memory and Temporal Nodes
  TIME_NODE: 'TimeNode',
  TEMPORAL_NODE: 'TemporalNode'
};

// Basic Link Types
const LINK_TYPES = {
  // Fundamental Links
  LIST_LINK: 'ListLink',
  SET_LINK: 'SetLink',
  MEMBER_LINK: 'MemberLink',
  
  // Inheritance and Similarity
  INHERITANCE_LINK: 'InheritanceLink',
  SIMILARITY_LINK: 'SimilarityLink',
  SUBSET_LINK: 'SubsetLink',
  
  // Logical Links
  AND_LINK: 'AndLink',
  OR_LINK: 'OrLink',
  NOT_LINK: 'NotLink',
  IMPLICATION_LINK: 'ImplicationLink',
  EQUIVALENCE_LINK: 'EquivalenceLink',
  
  // Evaluation and Execution
  EVALUATION_LINK: 'EvaluationLink',
  EXECUTION_LINK: 'ExecutionLink',
  
  // Quantifier Links
  FOR_ALL_LINK: 'ForAllLink',
  EXISTS_LINK: 'ExistsLink',
  
  // Temporal Links
  AT_TIME_LINK: 'AtTimeLink',
  BEFORE_LINK: 'BeforeLink',
  AFTER_LINK: 'AfterLink',
  DURING_LINK: 'DuringLink',
  
  // Spatial Links
  AT_LOCATION_LINK: 'AtLocationLink',
  
  // Contextual Links
  CONTEXT_LINK: 'ContextLink',
  
  // Pattern Matching Links
  BIND_LINK: 'BindLink',
  GET_LINK: 'GetLink',
  SATISFY_LINK: 'SatisfyLink',
  
  // Mathematical Links
  PLUS_LINK: 'PlusLink',
  MINUS_LINK: 'MinusLink',
  TIMES_LINK: 'TimesLink',
  DIVIDE_LINK: 'DivideLink',
  
  // Conditional Links
  COND_LINK: 'CondLink',
  
  // Reference Links
  REFERENCE_LINK: 'ReferenceLink',
  
  // Associative Links
  ASSOCIATIVE_LINK: 'AssociativeLink',
  
  // Sequential Links
  SEQUENTIAL_LINK: 'SequentialLink',
  
  // Attention Links
  HEBBIAN_LINK: 'HebbianLink',
  ASYMMETRIC_HEBBIAN_LINK: 'AsymmetricHebbianLink',
  SYMMETRIC_HEBBIAN_LINK: 'SymmetricHebbianLink'
};

// Specialized OpenCog Types for AI Reasoning
const OPENCOG_TYPES = {
  // PLN Specific
  PLN_RULE_NODE: 'PLNRuleNode',
  PLN_FORMULA_NODE: 'PLNFormulaNode',
  
  // ECAN Specific
  ATTENTION_LINK: 'AttentionLink',
  ECONOMIC_LINK: 'EconomicLink',
  
  // Learning and Pattern Mining
  PATTERN_NODE: 'PatternNode',
  PATTERN_LINK: 'PatternLink',
  FREQUENT_PATTERN_LINK: 'FrequentPatternLink',
  
  // Goal and Planning
  GOAL_NODE: 'GoalNode',
  PLAN_NODE: 'PlanNode',
  ACTION_NODE: 'ActionNode',
  TASK_NODE: 'TaskNode',
  
  // Agent and Cognitive
  AGENT_NODE: 'AgentNode',
  COGNITIVE_PROCESS_NODE: 'CognitiveProcessNode',
  
  // Memory Types
  EPISODIC_MEMORY_NODE: 'EpisodicMemoryNode',
  SEMANTIC_MEMORY_NODE: 'SemanticMemoryNode',
  WORKING_MEMORY_NODE: 'WorkingMemoryNode',
  
  // Learning Types
  LEARNING_LINK: 'LearningLink',
  FEEDBACK_LINK: 'FeedbackLink',
  
  // Reward and Motivation
  REWARD_NODE: 'RewardNode',
  MOTIVATION_NODE: 'MotivationNode'
};

// All atom types combined
const ATOM_TYPES = {
  ...NODE_TYPES,
  ...LINK_TYPES,
  ...OPENCOG_TYPES
};

// Type hierarchy for inheritance checking
const TYPE_HIERARCHY = {
  // Node hierarchy
  [NODE_TYPES.CONCEPT_NODE]: ['Node'],
  [NODE_TYPES.PREDICATE_NODE]: ['Node'],
  [NODE_TYPES.SCHEMA_NODE]: ['Node'],
  [NODE_TYPES.VARIABLE_NODE]: ['Node'],
  [NODE_TYPES.NUMBER_NODE]: ['Node'],
  [NODE_TYPES.WORD_NODE]: ['Node'],
  
  // Link hierarchy
  [LINK_TYPES.LIST_LINK]: ['Link'],
  [LINK_TYPES.SET_LINK]: ['Link'],
  [LINK_TYPES.INHERITANCE_LINK]: ['Link'],
  [LINK_TYPES.SIMILARITY_LINK]: ['Link'],
  [LINK_TYPES.EVALUATION_LINK]: ['Link'],
  [LINK_TYPES.AND_LINK]: ['Link'],
  [LINK_TYPES.OR_LINK]: ['Link'],
  [LINK_TYPES.NOT_LINK]: ['Link'],
  
  // OpenCog specific hierarchy
  [OPENCOG_TYPES.GOAL_NODE]: ['Node'],
  [OPENCOG_TYPES.AGENT_NODE]: ['Node'],
  [OPENCOG_TYPES.ATTENTION_LINK]: ['Link']
};

/**
 * Check if a type is a node type
 */
function isNodeType(type) {
  return Object.values(NODE_TYPES).includes(type) || 
         [OPENCOG_TYPES.GOAL_NODE, OPENCOG_TYPES.AGENT_NODE, 
          OPENCOG_TYPES.PLN_RULE_NODE, OPENCOG_TYPES.PATTERN_NODE,
          OPENCOG_TYPES.EPISODIC_MEMORY_NODE, OPENCOG_TYPES.SEMANTIC_MEMORY_NODE,
          OPENCOG_TYPES.WORKING_MEMORY_NODE, OPENCOG_TYPES.REWARD_NODE,
          OPENCOG_TYPES.MOTIVATION_NODE, OPENCOG_TYPES.TASK_NODE,
          OPENCOG_TYPES.ACTION_NODE, OPENCOG_TYPES.PLAN_NODE,
          OPENCOG_TYPES.COGNITIVE_PROCESS_NODE, OPENCOG_TYPES.PLN_FORMULA_NODE].includes(type);
}

/**
 * Check if a type is a link type
 */
function isLinkType(type) {
  return Object.values(LINK_TYPES).includes(type) || 
         [OPENCOG_TYPES.ATTENTION_LINK, OPENCOG_TYPES.ECONOMIC_LINK,
          OPENCOG_TYPES.PATTERN_LINK, OPENCOG_TYPES.FREQUENT_PATTERN_LINK,
          OPENCOG_TYPES.LEARNING_LINK, OPENCOG_TYPES.FEEDBACK_LINK].includes(type);
}

/**
 * Check if a type inherits from another type
 */
function inheritsFrom(childType, parentType) {
  const hierarchy = TYPE_HIERARCHY[childType];
  return hierarchy && hierarchy.includes(parentType);
}

/**
 * Get all subtypes of a given type
 */
function getSubtypes(parentType) {
  const subtypes = [];
  for (const [type, hierarchy] of Object.entries(TYPE_HIERARCHY)) {
    if (hierarchy.includes(parentType)) {
      subtypes.push(type);
    }
  }
  return subtypes;
}

/**
 * Validate if a type is a valid atom type
 */
function isValidType(type) {
  return Object.values(ATOM_TYPES).includes(type);
}

module.exports = {
  NODE_TYPES,
  LINK_TYPES,
  OPENCOG_TYPES,
  ATOM_TYPES,
  TYPE_HIERARCHY,
  isNodeType,
  isLinkType,
  inheritsFrom,
  getSubtypes,
  isValidType
};