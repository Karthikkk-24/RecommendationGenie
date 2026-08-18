export const ALGORITHM_VERSION = 'v1.0';

export const SCORING_WEIGHTS = {
  content: 0.3,
  taste: 0.25,
  feedback: 0.15,
  creator: 0.1,
  quality: 0.1,
  exploration: 0.1,
} as const;

export const PIPELINE = {
  candidatePoolSize: 500,
  scoredPoolSize: 100,
  aiRerankSize: 30,
  finalSize: 10,
  exploitationRatio: 0.8,
  explorationRatio: 0.2,
} as const;

export const TASTE = {
  min: -1,
  max: 1,
  decayFactor: 0.98,
  maxSingleDelta: 0.3,
  learningRates: {
    LOVE: 0.25,
    LIKE: 0.12,
    DISLIKE: -0.15,
    NOT_INTERESTED: -0.2,
    SAVE: 0.08,
    SKIP: -0.04,
    CONSUMED: 0.03,
    RATED: 0.1,
    VIEW: 0.01,
    CLICK: 0.02,
  },
} as const;

export const AUTH = {
  accessTokenTtlSeconds: 60 * 15,
  refreshTokenTtlSeconds: 60 * 60 * 24 * 7,
  emailTokenTtlSeconds: 60 * 60 * 24,
} as const;

export const EMBEDDING = {
  model: 'text-embedding-3-small',
  dimensions: 1536,
} as const;
