-- Drop stored column — value is now computed on the fly in youth_comms_checklist
ALTER TABLE youth DROP COLUMN IF EXISTS current_week_in_program;

-- Rebuild view with week_in_program as a computed field
CREATE OR REPLACE VIEW youth_comms_checklist AS
WITH app_comms AS (
  SELECT
    COALESCE(cl.application_id, y.application_id) AS app_id,
    cl.id AS comm_id,
    cl.stage_key,
    cl.sent_at
  FROM comms_log cl
  LEFT JOIN youth y ON y.id = cl.youth_id
  WHERE COALESCE(cl.application_id, y.application_id) IS NOT NULL
),
comms_agg AS (
  SELECT
    app_comms.app_id AS application_id,
    array_agg(DISTINCT app_comms.stage_key)                            AS received_keys,
    max(app_comms.sent_at)                                             AS last_comm_at,
    (array_agg(app_comms.stage_key ORDER BY app_comms.sent_at DESC))[1] AS last_comm_sent
  FROM app_comms
  GROUP BY app_comms.app_id
),
base AS (
  SELECT
    a.id                                                                        AS application_id,
    y.id                                                                        AS youth_id,
    COALESCE(y.first_name, a.first_name)                                        AS first_name,
    COALESCE(y.last_name,  a.last_name)                                         AS last_name,
    COALESCE(y.email,      a.email)                                             AS email,
    COALESCE(y.status,     a.screening_status)                                  AS current_stage,
    FLOOR(EXTRACT(epoch FROM (now() - COALESCE(y.stage_entered_at, a.stage_entered_at))) / 86400)::integer
                                                                                AS days_in_stage,
    COALESCE(ca.received_keys, ARRAY[]::text[])                                 AS received_keys,
    ca.last_comm_sent,
    ca.last_comm_at,
    CASE
      WHEN ca.last_comm_at IS NOT NULL
        THEN FLOOR(EXTRACT(epoch FROM (now() - ca.last_comm_at)) / 86400)::integer
      ELSE NULL::integer
    END                                                                         AS days_since_last_comm,
    FLOOR(EXTRACT(epoch FROM (now() - y.accepted_at)) / 604800)::int           AS week_in_program
  FROM applications a
  LEFT JOIN youth      y  ON y.application_id = a.id
  LEFT JOIN comms_agg  ca ON ca.application_id = a.id
),
expected AS (
  SELECT
    b.application_id,
    b.youth_id,
    b.first_name,
    b.last_name,
    b.email,
    b.current_stage,
    b.days_in_stage,
    b.received_keys,
    b.last_comm_sent,
    b.last_comm_at,
    b.days_since_last_comm,
    b.week_in_program,
    CASE b.current_stage
      WHEN 'declaration_pending'  THEN ARRAY['declaration_pending'::text]
      WHEN 'video_pending'        THEN ARRAY['declaration_pending'::text, 'declaration_confirmed'::text]
      WHEN 'video_review'         THEN ARRAY['declaration_pending'::text, 'declaration_confirmed'::text]
      WHEN 'mentor_pending'       THEN ARRAY['declaration_pending'::text, 'declaration_confirmed'::text, 'mentor_pending'::text]
      WHEN 'grant_pending'        THEN ARRAY['declaration_pending'::text, 'declaration_confirmed'::text, 'mentor_pending'::text, 'grant_pending'::text]
      WHEN 'grant_approved'       THEN ARRAY['declaration_pending'::text, 'declaration_confirmed'::text, 'mentor_pending'::text, 'grant_pending'::text, 'grant_approved'::text]
      WHEN 'grant_expired'        THEN ARRAY['declaration_pending'::text, 'declaration_confirmed'::text, 'mentor_pending'::text, 'grant_pending'::text]
      WHEN 'final_video_pending'  THEN ARRAY['declaration_pending'::text, 'declaration_confirmed'::text, 'mentor_pending'::text, 'grant_pending'::text, 'full_send_link'::text]
      WHEN 'full_send_review'     THEN ARRAY['declaration_pending'::text, 'declaration_confirmed'::text, 'mentor_pending'::text, 'grant_pending'::text, 'full_send_link'::text, 'full_send_submitted'::text]
      WHEN 'completed'            THEN ARRAY['declaration_pending'::text, 'declaration_confirmed'::text, 'mentor_pending'::text, 'grant_pending'::text, 'full_send_link'::text, 'full_send_submitted'::text]
      WHEN 'rejected'             THEN ARRAY['rejected'::text]
      ELSE ARRAY[]::text[]
    END AS expected_keys
  FROM base b
),
computed AS (
  SELECT
    e.application_id,
    e.youth_id,
    e.first_name,
    e.last_name,
    e.email,
    e.current_stage,
    e.days_in_stage,
    ARRAY(
      SELECT k.k FROM unnest(e.expected_keys) k(k)
      WHERE NOT (k.k = ANY (e.received_keys))
    )                         AS missing_comms,
    e.last_comm_sent,
    e.last_comm_at,
    e.days_since_last_comm,
    e.week_in_program,
    CASE e.current_stage
      WHEN 'declaration_pending' THEN
        CASE WHEN NOT ('nudge_declaration'::text  = ANY (e.received_keys)) THEN 'nudge_declaration'::text  ELSE 'deadline_removal'::text END
      WHEN 'video_pending' THEN
        CASE
          WHEN NOT ('nudge_first_drop_1'::text = ANY (e.received_keys)) THEN 'nudge_first_drop_1'::text
          WHEN NOT ('nudge_first_drop_2'::text = ANY (e.received_keys)) THEN 'nudge_first_drop_2'::text
          ELSE 'deadline_removal'::text
        END
      WHEN 'mentor_pending' THEN
        CASE
          WHEN NOT ('nudge_orientation_1'::text = ANY (e.received_keys)) THEN 'nudge_orientation_1'::text
          WHEN NOT ('nudge_orientation_2'::text = ANY (e.received_keys)) THEN 'nudge_orientation_2'::text
          ELSE 'deadline_removal'::text
        END
      WHEN 'grant_pending' THEN
        CASE WHEN NOT ('nudge_grant'::text = ANY (e.received_keys)) THEN 'nudge_grant'::text ELSE 'grant_expired'::text END
      WHEN 'final_video_pending' THEN
        CASE
          WHEN NOT ('nudge_full_send_1'::text = ANY (e.received_keys)) THEN 'nudge_full_send_1'::text
          WHEN NOT ('nudge_full_send_2'::text = ANY (e.received_keys)) THEN 'nudge_full_send_2'::text
          ELSE 'deadline_removal'::text
        END
      ELSE NULL::text
    END AS next_comm,
    CASE e.current_stage
      WHEN 'declaration_pending' THEN
        CASE WHEN NOT ('nudge_declaration'::text = ANY (e.received_keys)) THEN GREATEST(0, 6  - e.days_in_stage) ELSE GREATEST(0, 10 - e.days_in_stage) END
      WHEN 'video_pending' THEN
        CASE
          WHEN NOT ('nudge_first_drop_1'::text = ANY (e.received_keys)) THEN GREATEST(0, 5  - e.days_in_stage)
          WHEN NOT ('nudge_first_drop_2'::text = ANY (e.received_keys)) THEN GREATEST(0, 9  - e.days_in_stage)
          ELSE GREATEST(0, 10 - e.days_in_stage)
        END
      WHEN 'mentor_pending' THEN
        CASE
          WHEN NOT ('nudge_orientation_1'::text = ANY (e.received_keys)) THEN GREATEST(0, 3 - e.days_in_stage)
          WHEN NOT ('nudge_orientation_2'::text = ANY (e.received_keys)) THEN GREATEST(0, 6 - e.days_in_stage)
          ELSE GREATEST(0, 7 - e.days_in_stage)
        END
      WHEN 'grant_pending' THEN
        CASE WHEN NOT ('nudge_grant'::text = ANY (e.received_keys)) THEN GREATEST(0, 5 - e.days_in_stage) ELSE GREATEST(0, 21 - e.days_in_stage) END
      WHEN 'final_video_pending' THEN
        CASE
          WHEN NOT ('nudge_full_send_1'::text = ANY (e.received_keys)) THEN GREATEST(0, 7  - e.days_in_stage)
          WHEN NOT ('nudge_full_send_2'::text = ANY (e.received_keys)) THEN GREATEST(0, 12 - e.days_in_stage)
          ELSE GREATEST(0, 14 - e.days_in_stage)
        END
      ELSE NULL::integer
    END AS next_comm_in_days,
    CASE e.current_stage
      WHEN 'declaration_pending' THEN 10 - e.days_in_stage
      WHEN 'video_pending'       THEN 10 - e.days_in_stage
      WHEN 'mentor_pending'      THEN  7 - e.days_in_stage
      WHEN 'grant_pending'       THEN 21 - e.days_in_stage
      WHEN 'final_video_pending' THEN 14 - e.days_in_stage
      ELSE NULL::integer
    END AS deadline_in_days
  FROM expected e
)
SELECT
  application_id,
  youth_id,
  first_name,
  last_name,
  email,
  current_stage,
  days_in_stage,
  missing_comms,
  last_comm_sent,
  last_comm_at,
  days_since_last_comm,
  next_comm,
  next_comm_in_days,
  deadline_in_days,
  ((cardinality(missing_comms) > 0) OR (deadline_in_days IS NOT NULL AND deadline_in_days <= 2)) AS at_risk,
  week_in_program
FROM computed c;
