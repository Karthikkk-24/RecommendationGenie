-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('MOVIE', 'GAME', 'MUSIC', 'BOOK', 'TV_SHOW', 'ANIME', 'PODCAST');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EmailTokenPurpose" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('VIEW', 'CLICK', 'LIKE', 'LOVE', 'DISLIKE', 'SAVE', 'SKIP', 'CONSUMED', 'RATED', 'NOT_INTERESTED');

-- CreateEnum
CREATE TYPE "FeedbackReason" AS ENUM ('TOO_SLOW', 'TOO_PREDICTABLE', 'WRONG_GENRE', 'DONT_LIKE_CREATOR', 'NOT_INTERESTED_IN_PREMISE', 'TOO_DIFFICULT', 'TOO_DARK', 'TOO_MAINSTREAM', 'TOO_OBSCURE', 'NOT_MY_MOOD', 'OTHER');

-- CreateEnum
CREATE TYPE "FeedbackAction" AS ENUM ('LOVE', 'LIKE', 'MAYBE', 'NOT_FOR_ME', 'NEVER_THIS_TYPE', 'ALREADY_CONSUMED', 'SAVE');

-- CreateEnum
CREATE TYPE "FeatureType" AS ENUM ('GENRE', 'THEME', 'TAG', 'CREATOR', 'MEDIA_TYPE', 'PACING');

-- CreateEnum
CREATE TYPE "PersonRole" AS ENUM ('ACTOR', 'DIRECTOR', 'ARTIST', 'DEVELOPER', 'WRITER', 'COMPOSER', 'PUBLISHER');

-- CreateEnum
CREATE TYPE "EmbeddingEntityType" AS ENUM ('MEDIA', 'USER_TASTE');

-- CreateEnum
CREATE TYPE "RecommendationMode" AS ENUM ('FOR_YOU', 'SIMILAR_TO', 'HIDDEN_GEMS', 'DEEP_CUTS', 'SURPRISE_ME', 'MOOD', 'SHORTLIST');

-- CreateEnum
CREATE TYPE "Mood" AS ENUM ('CHILL', 'ADRENALINE', 'EMOTIONAL', 'DARK', 'FUNNY', 'MIND_BENDING', 'RELAXING', 'INTENSE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "country" TEXT,
    "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "emailVerifiedAt" TIMESTAMP(3),
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "onboarding" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabledMediaTypes" "MediaType"[],
    "favoriteGenres" TEXT[],
    "dislikedGenres" TEXT[],
    "preferredPacing" DOUBLE PRECISION,
    "preferredComplexity" DOUBLE PRECISION,
    "preferredTone" TEXT,
    "preferredThemes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "EmailTokenPurpose" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaItem" (
    "id" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "releaseDate" TIMESTAMP(3),
    "language" TEXT,
    "runtimeMinutes" INTEGER,
    "posterUrl" TEXT,
    "popularity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pacing" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "complexity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "darkness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emotionalIntensity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaSource" (
    "id" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw" JSONB,

    CONSTRAINT "MediaSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaGenre" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "MediaGenre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaGenreLink" (
    "mediaItemId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,

    CONSTRAINT "MediaGenreLink_pkey" PRIMARY KEY ("mediaItemId","genreId")
);

-- CreateTable
CREATE TABLE "MediaTag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "MediaTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaTagLink" (
    "mediaItemId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "MediaTagLink_pkey" PRIMARY KEY ("mediaItemId","tagId")
);

-- CreateTable
CREATE TABLE "MediaPerson" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "MediaPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaPersonLink" (
    "mediaItemId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" "PersonRole" NOT NULL,

    CONSTRAINT "MediaPersonLink_pkey" PRIMARY KEY ("mediaItemId","personId","role")
);

-- CreateTable
CREATE TABLE "MediaSimilarity" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MediaSimilarity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMediaInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL,
    "metadata" JSONB,
    "recommendationItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMediaInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMediaRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMediaRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "recommendationItemId" TEXT,
    "action" "FeedbackAction" NOT NULL,
    "reason" "FeedbackReason",
    "otherText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumptionHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsumptionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "mediaType" "MediaType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TasteProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "complexity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "darkness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emotionalIntensity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "novelty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "popularityPreference" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mainstreamVsNiche" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pacing" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "algorithmVersion" TEXT NOT NULL DEFAULT 'v1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TasteProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TastePreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "featureType" "FeatureType" NOT NULL,
    "featureKey" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TastePreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TasteProfileSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scalars" JSONB NOT NULL,
    "features" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TasteProfileSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationGeneration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "algorithmVersion" TEXT NOT NULL,
    "mode" "RecommendationMode" NOT NULL,
    "candidateCount" INTEGER NOT NULL,
    "scoringWeights" JSONB NOT NULL,
    "mood" "Mood",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationItem" (
    "id" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "contentScore" DOUBLE PRECISION NOT NULL,
    "tasteScore" DOUBLE PRECISION NOT NULL,
    "feedbackScore" DOUBLE PRECISION NOT NULL,
    "creatorScore" DOUBLE PRECISION NOT NULL,
    "qualityScore" DOUBLE PRECISION NOT NULL,
    "noveltyScore" DOUBLE PRECISION NOT NULL,
    "aiScore" DOUBLE PRECISION,
    "explanation" TEXT,
    "reason" TEXT,

    CONSTRAINT "RecommendationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Embedding" (
    "id" TEXT NOT NULL,
    "entityType" "EmbeddingEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "vector" vector(1536) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Embedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "requestType" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "latencyMs" INTEGER NOT NULL,
    "costEstimate" DOUBLE PRECISION,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiResponse" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "AiResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "eventName" TEXT NOT NULL,
    "mediaItemId" TEXT,
    "generationId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CacheEntry" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CacheEntry_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "RecommendationConfig" (
    "id" TEXT NOT NULL,
    "algorithmVersion" TEXT NOT NULL,
    "weights" JSONB NOT NULL,
    "pipeline" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailToken_tokenHash_key" ON "EmailToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailToken_userId_purpose_idx" ON "EmailToken"("userId", "purpose");

-- CreateIndex
CREATE INDEX "MediaItem_type_popularity_idx" ON "MediaItem"("type", "popularity");

-- CreateIndex
CREATE INDEX "MediaItem_type_releaseDate_idx" ON "MediaItem"("type", "releaseDate");

-- CreateIndex
CREATE INDEX "MediaItem_title_idx" ON "MediaItem"("title");

-- CreateIndex
CREATE INDEX "MediaSource_mediaItemId_idx" ON "MediaSource"("mediaItemId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaSource_provider_externalId_key" ON "MediaSource"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaGenre_slug_key" ON "MediaGenre"("slug");

-- CreateIndex
CREATE INDEX "MediaGenreLink_genreId_idx" ON "MediaGenreLink"("genreId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaTag_slug_key" ON "MediaTag"("slug");

-- CreateIndex
CREATE INDEX "MediaTagLink_tagId_idx" ON "MediaTagLink"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaPerson_slug_key" ON "MediaPerson"("slug");

-- CreateIndex
CREATE INDEX "MediaPersonLink_personId_idx" ON "MediaPersonLink"("personId");

-- CreateIndex
CREATE INDEX "MediaSimilarity_fromId_score_idx" ON "MediaSimilarity"("fromId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "MediaSimilarity_fromId_toId_key" ON "MediaSimilarity"("fromId", "toId");

-- CreateIndex
CREATE INDEX "UserMediaInteraction_userId_createdAt_idx" ON "UserMediaInteraction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserMediaInteraction_userId_mediaItemId_idx" ON "UserMediaInteraction"("userId", "mediaItemId");

-- CreateIndex
CREATE INDEX "UserMediaInteraction_userId_type_idx" ON "UserMediaInteraction"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "UserMediaRating_userId_mediaItemId_key" ON "UserMediaRating"("userId", "mediaItemId");

-- CreateIndex
CREATE INDEX "UserFeedback_userId_createdAt_idx" ON "UserFeedback"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SavedItem_userId_createdAt_idx" ON "SavedItem"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedItem_userId_mediaItemId_key" ON "SavedItem"("userId", "mediaItemId");

-- CreateIndex
CREATE INDEX "ConsumptionHistory_userId_consumedAt_idx" ON "ConsumptionHistory"("userId", "consumedAt");

-- CreateIndex
CREATE INDEX "SearchHistory_userId_createdAt_idx" ON "SearchHistory"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TasteProfile_userId_key" ON "TasteProfile"("userId");

-- CreateIndex
CREATE INDEX "TastePreference_userId_featureType_featureKey_idx" ON "TastePreference"("userId", "featureType", "featureKey");

-- CreateIndex
CREATE UNIQUE INDEX "TastePreference_userId_featureType_featureKey_key" ON "TastePreference"("userId", "featureType", "featureKey");

-- CreateIndex
CREATE INDEX "TasteProfileSnapshot_userId_createdAt_idx" ON "TasteProfileSnapshot"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RecommendationGeneration_userId_createdAt_idx" ON "RecommendationGeneration"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RecommendationItem_generationId_rank_idx" ON "RecommendationItem"("generationId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationItem_generationId_rank_key" ON "RecommendationItem"("generationId", "rank");

-- CreateIndex
CREATE INDEX "Embedding_entityType_entityId_idx" ON "Embedding"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Embedding_entityType_entityId_model_key" ON "Embedding"("entityType", "entityId", "model");

-- CreateIndex
CREATE INDEX "AiRequest_createdAt_idx" ON "AiRequest"("createdAt");

-- CreateIndex
CREATE INDEX "AiRequest_success_createdAt_idx" ON "AiRequest"("success", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiResponse_requestId_key" ON "AiResponse"("requestId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventName_createdAt_idx" ON "AnalyticsEvent"("eventName", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userId_createdAt_idx" ON "AnalyticsEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CacheEntry_expiresAt_idx" ON "CacheEntry"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationConfig_algorithmVersion_key" ON "RecommendationConfig"("algorithmVersion");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailToken" ADD CONSTRAINT "EmailToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaSource" ADD CONSTRAINT "MediaSource_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaGenreLink" ADD CONSTRAINT "MediaGenreLink_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaGenreLink" ADD CONSTRAINT "MediaGenreLink_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "MediaGenre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaTagLink" ADD CONSTRAINT "MediaTagLink_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaTagLink" ADD CONSTRAINT "MediaTagLink_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "MediaTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaPersonLink" ADD CONSTRAINT "MediaPersonLink_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaPersonLink" ADD CONSTRAINT "MediaPersonLink_personId_fkey" FOREIGN KEY ("personId") REFERENCES "MediaPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaSimilarity" ADD CONSTRAINT "MediaSimilarity_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaSimilarity" ADD CONSTRAINT "MediaSimilarity_toId_fkey" FOREIGN KEY ("toId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMediaInteraction" ADD CONSTRAINT "UserMediaInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMediaInteraction" ADD CONSTRAINT "UserMediaInteraction_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMediaInteraction" ADD CONSTRAINT "UserMediaInteraction_recommendationItemId_fkey" FOREIGN KEY ("recommendationItemId") REFERENCES "RecommendationItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMediaRating" ADD CONSTRAINT "UserMediaRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMediaRating" ADD CONSTRAINT "UserMediaRating_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFeedback" ADD CONSTRAINT "UserFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFeedback" ADD CONSTRAINT "UserFeedback_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFeedback" ADD CONSTRAINT "UserFeedback_recommendationItemId_fkey" FOREIGN KEY ("recommendationItemId") REFERENCES "RecommendationItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedItem" ADD CONSTRAINT "SavedItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedItem" ADD CONSTRAINT "SavedItem_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumptionHistory" ADD CONSTRAINT "ConsumptionHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumptionHistory" ADD CONSTRAINT "ConsumptionHistory_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchHistory" ADD CONSTRAINT "SearchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TasteProfile" ADD CONSTRAINT "TasteProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TastePreference" ADD CONSTRAINT "TastePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TasteProfileSnapshot" ADD CONSTRAINT "TasteProfileSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationGeneration" ADD CONSTRAINT "RecommendationGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationItem" ADD CONSTRAINT "RecommendationItem_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "RecommendationGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationItem" ADD CONSTRAINT "RecommendationItem_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiResponse" ADD CONSTRAINT "AiResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AiRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Vector and fuzzy search indexes
CREATE INDEX IF NOT EXISTS "Embedding_vector_idx" ON "Embedding" USING hnsw (vector vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "MediaItem_title_trgm_idx" ON "MediaItem" USING gin (title gin_trgm_ops);

