ALTER TABLE "notifications"
ADD COLUMN "expenseId" UUID,
ADD COLUMN "eventKey" TEXT;

CREATE INDEX "notifications_expenseId_idx" ON "notifications"("expenseId");
CREATE UNIQUE INDEX "notifications_userId_eventKey_key" ON "notifications"("userId", "eventKey");
