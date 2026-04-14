-- Staff review view — pending video submissions
-- Open in Supabase, click the YouTube link to watch,
-- then manually set screening_status = 'accepted' on the row.
-- The accepted trigger fires automatically from that update.

create or replace view pending_videos as
select
  id,
  first_name,
  last_name,
  video_url,
  video_submitted_at,
  screening_status
from applications
where screening_status = 'video_review'
order by video_submitted_at asc;
