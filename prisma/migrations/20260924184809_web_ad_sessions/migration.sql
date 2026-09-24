-- CreateTable
CREATE TABLE "web_ad_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "web_ad_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "web_ad_sessions_userId_startedAt_idx" ON "web_ad_sessions"("userId", "startedAt");

-- AddForeignKey
ALTER TABLE "web_ad_sessions" ADD CONSTRAINT "web_ad_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
