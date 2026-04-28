ALTER TABLE grant_requests ADD COLUMN IF NOT EXISTS mailing_address text;

UPDATE grant_requests gr
SET mailing_address = y.address
FROM youth y
WHERE gr.youth_id = y.id
AND gr.mailing_address IS NULL;
