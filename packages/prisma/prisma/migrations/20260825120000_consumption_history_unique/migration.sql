-- Deduplicate consumption rows (keep latest consumedAt per user+media).
DELETE FROM "ConsumptionHistory" AS older
USING "ConsumptionHistory" AS newer
WHERE older."userId" = newer."userId"
  AND older."mediaItemId" = newer."mediaItemId"
  AND (
    older."consumedAt" < newer."consumedAt"
    OR (older."consumedAt" = newer."consumedAt" AND older."id" < newer."id")
  );

CREATE UNIQUE INDEX "ConsumptionHistory_userId_mediaItemId_key" ON "ConsumptionHistory"("userId", "mediaItemId");
