-- One pick'em entry per Cup team per season. Who a member is is their choice of team (no PIN, by
-- Josh's call on 2026-10-14: see README.md, "Known limits").
CREATE TABLE entries (
  year TEXT NOT NULL,
  ffu_id TEXT NOT NULL,
  picks TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (year, ffu_id)
);
