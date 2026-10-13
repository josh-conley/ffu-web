-- One pick'em entry per Cup team per season. The PIN is never stored, only its PBKDF2 hash.
CREATE TABLE entries (
  year TEXT NOT NULL,
  ffu_id TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  picks TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  PRIMARY KEY (year, ffu_id)
);
