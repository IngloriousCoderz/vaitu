# Moderation

The stores expect a way to report content and someone acting on reports. Here
that someone is you, in the Supabase SQL editor. Users report from an event, an
applicant or a review; `report-content` stores a row in `reports` and emails
`ALERT_EMAIL` with what you need below. A user can send 5 reports a day
(`reports_daily_limit`).

| To do this              | Run                                                                       |
| ----------------------- | ------------------------------------------------------------------------- |
| See what's open         | `select * from reports where status = 'open' order by created_at;`        |
| Remove an event         | `select retire_event('<event_id>');`                                      |
| Hide a review's comment | `update job_reviews set hidden_at = now() where application_id = '<id>';` |
| Close a report          | `update reports set status = 'resolved' where id = '<id>';`               |

A hidden comment stops showing, but its rating still counts. To remove someone,
delete the user in the dashboard (Authentication → Users): their history stays
as `[Deleted User]`, as when they erase their own account. They can sign up
again with another address, so this isn't a permanent ban.

## Blocking

Blocking needs nothing from you. It works both ways: neither person sees the
other's open events or can apply to them, and undecided applications between
them are withdrawn without counting against anyone. People undo it in
Preferences.

Next: [Analytics](analytics.md).
