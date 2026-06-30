-- Add network field to Escrow and convert unique constraint from pda-only to pda+network
-- This allows the same PDA address to exist on both devnet and mainnet without collision.

-- Step 1: Add the network column with a default
ALTER TABLE "Escrow" ADD COLUMN "network" TEXT NOT NULL DEFAULT 'devnet';

-- Step 2: Drop the old unique constraint on pda alone (if it exists)
ALTER TABLE "Escrow" DROP CONSTRAINT IF EXISTS "Escrow_pda_key";

-- Step 3: Add the new composite unique constraint
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_pda_network_key" UNIQUE ("pda", "network");

-- Step 4: Add indexes for the new column
CREATE INDEX "Escrow_network_idx" ON "Escrow"("network");
CREATE INDEX "Escrow_clientWallet_network_idx" ON "Escrow"("clientWallet", "network");
CREATE INDEX "Escrow_freelancerWallet_network_idx" ON "Escrow"("freelancerWallet", "network");
CREATE INDEX "Escrow_status_network_idx" ON "Escrow"("status", "network");

-- Note: existing rows will get network='devnet' automatically via the DEFAULT.
-- Run this migration with: npx prisma migrate deploy
