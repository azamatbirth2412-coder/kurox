-- Migration: remove FK constraint on comments.animeId
-- SQLite doesn't support ALTER COLUMN, so we recreate the table

PRAGMA foreign_keys=OFF;

CREATE TABLE "comments_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "comments_new" SELECT "id", "userId", "animeId", "text", "status", "createdAt", "updatedAt" FROM "comments";

DROP TABLE "comments";

ALTER TABLE "comments_new" RENAME TO "comments";

PRAGMA foreign_keys=ON;
