CREATE TABLE waitlist_emails (
    email TEXT PRIMARY KEY CHECK (length(email) BETWEEN 3 AND 320),
    created_at INTEGER NOT NULL CHECK (created_at >= 0)
) STRICT;

CREATE TABLE waitlist_attempts (
    id INTEGER PRIMARY KEY,
    ip_hash TEXT NOT NULL CHECK (length(ip_hash) = 64),
    created_at INTEGER NOT NULL CHECK (created_at >= 0)
) STRICT;

CREATE INDEX waitlist_attempts_by_time ON waitlist_attempts(created_at);
CREATE INDEX waitlist_attempts_by_client ON waitlist_attempts(ip_hash, created_at);

CREATE TRIGGER waitlist_rate_limit
BEFORE INSERT ON waitlist_attempts
BEGIN
    SELECT CASE WHEN (
        SELECT count(*) FROM waitlist_attempts
        WHERE created_at > NEW.created_at - 3600
    ) >= 30 OR (
        SELECT count(*) FROM waitlist_attempts
        WHERE ip_hash = NEW.ip_hash AND created_at > NEW.created_at - 900
    ) >= 3 THEN RAISE(ABORT, 'WAITLIST_RATE_LIMIT') END;
END;

CREATE TRIGGER waitlist_capacity
BEFORE INSERT ON waitlist_emails
WHEN NOT EXISTS (SELECT 1 FROM waitlist_emails WHERE email = NEW.email)
    AND (SELECT count(*) FROM waitlist_emails) >= 5000
BEGIN
    SELECT RAISE(ABORT, 'WAITLIST_FULL');
END;
