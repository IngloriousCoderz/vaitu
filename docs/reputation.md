# Reputation

Handing your client to a stranger is a risk, so an organizer needs to know who
they are picking. Ranks and badges tell them, and they are built on what
actually happened to a job rather than on activity.

## What is kept

Two things that look like deletions keep their row, because they are someone's
track record:

- **Withdrawing** sets an application to `withdrawn`, through
  `withdraw_application()`, and records what it was in `withdrawn_from`. The
  same person can apply again, with a new row. Deactivating an account withdraws
  its undecided applications with `withdrawn_from` left null, so they don't count
  against anyone, and its upcoming wins as `selected`, so those do.
- **Deleting an event**, through `delete_event()`, wipes everything it says
  (title, location, details, transcript, audio, photos) and sets `deleted_at`,
  and RLS hides it from then on. An event nobody ever applied to has no history
  to keep, so its row goes.

So clients can't delete either of them, and every query that shows applications
filters out `withdrawn`. Deleting an account still removes everything by
cascade.

## Job reports and reviews

Once the event date has come, the organizer reports on the winner in the
applications they received: the job was done, with 1 to 5 stars and an optional
comment; they did not show up; or the event was cancelled, which counts for
nobody. A report is one row in `job_reviews`, written once through
`submit_job_review()`. A reviewed job can't be withdrawn from.

`request_job_outcomes()` runs hourly on pg_cron and asks the organizer once, the
day after the event, with a `job_outcome_due` notification.

Reviews go one way, from organizer to winner: there is nothing yet for a winner
to review an organizer with, or to dispute a report.

## Ranks and badges

`profile_stats()` computes both from that history. It only answers for yourself
and for people applying to your events, who see your whole record rather than
the part of it RLS would show them. `profile_reviews()` does the same for the
latest written reviews.

Points only come from confirmed work, and never go below zero:

| What happened              | Points |
| -------------------------- | ------ |
| Job done                   | +20    |
| Review of 4 stars or more  | +5     |
| Review of 2 stars or less  | -10    |
| Won a job, then dropped it | -15    |
| Did not show up            | -30    |

Badges describe habits, and nobody chooses them:

| Badge              | Earned by                                                 |
| ------------------ | --------------------------------------------------------- |
| Top Rated          | Averaging 4.5 stars or more over at least 3 reviews       |
| Reliable           | At least 3 jobs done, with no dropouts or no-shows        |
| Generous Colleague | Handing off at least 3 jobs                               |
| Serial Applicant   | Sending at least 10 applications                          |
| Serial Withdrawer  | Withdrawing at least 3, and a third of those sent or more |
| Unreliable         | Dropping out or not showing up at least twice             |

Every number in these tables lives in `app_config`, so changing one needs no
release: the Ranks page reads them too, and fills them into its descriptions.
The fallbacks in `src/constants/index.js` should follow, and a test fails when
they don't.

Next: [Analytics](analytics.md).
