# Supabase Webhooks

All webhooks are configured in Supabase Dashboard → Database → Webhooks.
Every webhook posts the full row payload to its Edge Function URL.

---

## on_application_insert

| Field    | Value                                                           |
|----------|-----------------------------------------------------------------|
| Name     | on_application_insert                                           |
| Table    | public.applications                                             |
| Event    | INSERT                                                          |
| Function | screen-application                                              |
| URL      | https://bqysrqjywxdmvcmxxrui.supabase.co/functions/v1/screen-application |

**What it does:** Fires when a new application is submitted. Calls Claude to screen for age, location, and passion quality. Advances status submitted → screening → declaration_pending (or rejected / flagged).

---

## on_application_update

| Field    | Value                                                           |
|----------|-----------------------------------------------------------------|
| Name     | on_application_update                                           |
| Table    | public.applications                                             |
| Event    | UPDATE                                                          |
| Function | validate-video                                                  |
| URL      | https://bqysrqjywxdmvcmxxrui.supabase.co/functions/v1/validate-video |

**What it does:** Fires on every UPDATE to applications. Proceeds only when `screening_status = 'video_pending'` and `video_url` is present. Advances status video_pending → video_review and writes `video_submitted_at`.

---

## on_application_accepted

| Field    | Value                                                           |
|----------|-----------------------------------------------------------------|
| Name     | on_application_accepted                                         |
| Table    | public.applications                                             |
| Event    | UPDATE                                                          |
| Function | on-acceptance                                                   |
| URL      | https://bqysrqjywxdmvcmxxrui.supabase.co/functions/v1/on-acceptance |

**What it does:** Fires on every UPDATE to applications. Proceeds only when `screening_status = 'accepted'` (set manually by staff in Table Editor after watching the video). Creates the youth row with `status = 'onboarding'`. Idempotent — skips if a youth row already exists for this application.

**Manual step required:** Staff opens the `pending_videos` view in Supabase, watches the YouTube link, then sets `screening_status = 'accepted'` on the row. This update triggers the webhook automatically.

---

## on_youth_insert

| Field    | Value                                                           |
|----------|-----------------------------------------------------------------|
| Name     | on_youth_insert                                                 |
| Table    | public.youth                                                    |
| Event    | INSERT                                                          |
| Function | match-champion                                                  |
| URL      | https://bqysrqjywxdmvcmxxrui.supabase.co/functions/v1/match-champion |

**What it does:** Fires when a new youth row is inserted (by on-acceptance). Uses Claude AI to match the youth with the best available champion based on passion alignment. Advances youth status onboarding → mentor_pending. Increments champion's `active_youth_count`. Sends a group intro email to both youth and champion. Idempotent via `advance_status()` StatusConflictError guard.

---

## Notes

- All Edge Functions use `DB_SERVICE_KEY` (service role) — never the anon key.
- All tables have RLS enabled. Service role policies grant full access.
- Webhook secrets should be set in Edge Function environment variables.
- process-declaration is invoked **directly** by `api/declare-submit.js` — it is not a webhook.
