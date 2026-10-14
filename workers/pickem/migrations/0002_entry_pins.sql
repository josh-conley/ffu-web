-- Entries gain a PIN (Josh's call, 2026-10-13): a team's first save sets it, later saves need it.
-- The PIN is never stored, only a salted hash (src/pin.ts).
--
-- Added in place, not by rebuilding the table, so an entry saved before this shipped survives: it
-- has an empty hash, and its next save sets the PIN (store.ts `create`).
ALTER TABLE entries ADD COLUMN pin_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE entries ADD COLUMN pin_salt TEXT NOT NULL DEFAULT '';

-- Josh's own pre-PIN test entry, removed at his request.
DELETE FROM entries WHERE year = '2026' AND ffu_id = 'ffu-023';
