CREATE TABLE "financial_transaction_favorite" (
    "transactionId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    CONSTRAINT "financial_favorite_pkey" PRIMARY KEY ("transactionId", "ownerId"),
    CONSTRAINT "financial_favorite_transaction_fkey" FOREIGN KEY ("transactionId", "ownerId")
        REFERENCES "financial_transaction" ("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "financial_favorite_owner_idx" ON "financial_transaction_favorite" ("ownerId");
