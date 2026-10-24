CREATE TABLE auth_rates (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX auth_rates_expiry ON auth_rates(expires);
-- This queue intentionally has no workspace FK: deletion must survive deletion
-- of the workspace and be safely retried after a transient R2 outage.
CREATE TABLE object_deletions (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0);
CREATE INDEX object_deletions_due ON object_deletions(next_attempt);
