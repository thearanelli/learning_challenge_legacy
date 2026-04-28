ALTER TABLE grant_requests ALTER COLUMN grant_coding SET DEFAULT 'LC26';
UPDATE grant_requests SET grant_coding = 'LC26' WHERE grant_coding IS NULL;
