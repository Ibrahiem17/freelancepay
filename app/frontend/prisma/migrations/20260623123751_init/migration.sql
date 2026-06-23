-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('ACTIVE', 'SUBMITTED', 'COMPLETED', 'CANCELLED', 'REVISION_REQUESTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ESCROW_CREATED', 'WORK_SUBMITTED', 'REVISION_REQUESTED', 'WORK_APPROVED', 'ESCROW_CANCELLED', 'PAYMENT_RELEASED');

-- CreateEnum
CREATE TYPE "JobPostStatus" AS ENUM ('OPEN', 'FILLED', 'CLOSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "displayName" TEXT,
    "bio" TEXT,
    "skills" TEXT[],
    "hourlyRate" DECIMAL(65,30),
    "avatarUrl" TEXT,
    "email" TEXT,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isFreelancer" BOOLEAN NOT NULL DEFAULT false,
    "isClient" BOOLEAN NOT NULL DEFAULT false,
    "averageRating" DOUBLE PRECISION,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escrow" (
    "id" TEXT NOT NULL,
    "pda" TEXT NOT NULL,
    "clientWallet" TEXT NOT NULL,
    "freelancerWallet" TEXT NOT NULL,
    "amountLamports" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "workSubmission" TEXT,
    "revisionNote" TEXT,
    "status" "EscrowStatus" NOT NULL,
    "onChainCreatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Escrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientWallet" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "escrowPda" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "escrowPda" TEXT NOT NULL,
    "clientWallet" TEXT NOT NULL,
    "freelancerWallet" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPost" (
    "id" TEXT NOT NULL,
    "clientWallet" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budgetSOL" DECIMAL(65,30) NOT NULL,
    "requiredSkills" TEXT[],
    "status" "JobPostStatus" NOT NULL DEFAULT 'OPEN',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Escrow_pda_key" ON "Escrow"("pda");

-- CreateIndex
CREATE INDEX "Escrow_clientWallet_idx" ON "Escrow"("clientWallet");

-- CreateIndex
CREATE INDEX "Escrow_freelancerWallet_idx" ON "Escrow"("freelancerWallet");

-- CreateIndex
CREATE INDEX "Escrow_status_idx" ON "Escrow"("status");

-- CreateIndex
CREATE INDEX "Notification_recipientWallet_createdAt_idx" ON "Notification"("recipientWallet", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_escrowPda_key" ON "Review"("escrowPda");

-- CreateIndex
CREATE INDEX "JobPost_status_createdAt_idx" ON "JobPost"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_clientWallet_fkey" FOREIGN KEY ("clientWallet") REFERENCES "User"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_freelancerWallet_fkey" FOREIGN KEY ("freelancerWallet") REFERENCES "User"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientWallet_fkey" FOREIGN KEY ("recipientWallet") REFERENCES "User"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPost" ADD CONSTRAINT "JobPost_clientWallet_fkey" FOREIGN KEY ("clientWallet") REFERENCES "User"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;
