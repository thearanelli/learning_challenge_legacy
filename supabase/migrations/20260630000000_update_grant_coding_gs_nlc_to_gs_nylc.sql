UPDATE grant_requests SET grant_coding = 'GS_NYLC' WHERE grant_coding = 'GS_NLC';

ALTER TABLE grant_requests ALTER COLUMN grant_coding SET DEFAULT 'GS_NYLC';
