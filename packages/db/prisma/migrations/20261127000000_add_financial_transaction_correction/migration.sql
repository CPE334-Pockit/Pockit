CREATE TYPE "FinancialCorrectionAction" AS ENUM ('REPLACE', 'VOID');

CREATE TABLE "financial_transaction_correction" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "originalId" TEXT NOT NULL,
    "replacementId" TEXT,
    "action" "FinancialCorrectionAction" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "financial_transaction_correction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "financial_correction_action_replacement_check" CHECK (
        ("action" = 'REPLACE' AND "replacementId" IS NOT NULL AND "replacementId" <> "originalId")
        OR ("action" = 'VOID' AND "replacementId" IS NULL)
    ),
    CONSTRAINT "financial_correction_reason_check" CHECK (BTRIM("reason") <> '')
);

CREATE UNIQUE INDEX "financial_correction_original_key"
    ON "financial_transaction_correction"("originalId", "ownerId");
CREATE UNIQUE INDEX "financial_correction_replacement_key"
    ON "financial_transaction_correction"("replacementId", "ownerId");
CREATE INDEX "financial_correction_owner_created_idx"
    ON "financial_transaction_correction"("ownerId", "createdAt");

ALTER TABLE "financial_transaction_correction"
    ADD CONSTRAINT "financial_correction_original_fkey"
    FOREIGN KEY ("originalId", "ownerId") REFERENCES "financial_transaction"("id", "ownerId")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_transaction_correction"
    ADD CONSTRAINT "financial_correction_replacement_fkey"
    FOREIGN KEY ("replacementId", "ownerId") REFERENCES "financial_transaction"("id", "ownerId")
    ON DELETE RESTRICT ON UPDATE CASCADE;
