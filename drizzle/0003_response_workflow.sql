ALTER TABLE submissions ADD COLUMN workflow_status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE submissions ADD COLUMN internal_notes TEXT NOT NULL DEFAULT '';
