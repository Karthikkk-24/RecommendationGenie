-- AlterTable
ALTER TABLE "UserNotificationPreference" ADD COLUMN "lastDigestSentAt" TIMESTAMP(3),
ADD COLUMN "lastDigestGenerationId" TEXT;
