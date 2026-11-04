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
- **Deleting a job**, through `delete_job()`, wipes everything it says
  (title, location, details, photos) and sets `deleted_at`,
  and RLS hides it from then on. A job nobody ever applied to has no history
  to keep, so its row goes.

So clients can't delete either of them, and every query that shows applications
filters out `withdrawn`.

## Deleting an account

Deleting an account, from the profile or the link in the deactivation email,
goes through `erase-account`, which removes the person's files and then the
auth user. `erase_profile_activity()` runs on the way, however the account goes:
it withdraws what is undecided, wipes their motivations and every job they
posted, and tells whoever was counting on an upcoming one. Their rows stay with
the owner set to null, which the app shows as `[Deleted User]`, so nobody else
loses a review or a job from their record. Reviews they wrote stay, since they
never showed an author, and so do reviews about them.

The email's link points at `APP_URL`, a function secret. It lasts 30 days, is
stored only as a hash, and stops working when they sign back in. Functions skip sending email on the local stack.

## Job reports and reviews

Once the job date has come, the organizer reports on the winner in the
applications they received: the job was done, with 1 to 5 stars and an optional
comment; they did not show up; or the job was cancelled, which counts for
nobody. A report is one row in `job_reviews`, written once through
`submit_job_review()`. A reviewed job can't be withdrawn from.

`request_job_outcomes()` runs hourly on pg_cron and asks the organizer once, the
day after the job date, with a `job_outcome_due` notification.

Reviews go one way, from organizer to winner: there is nothing yet for a winner
to review an organizer with, or to dispute a report.

## Ranks and badges

`profile_stats()` computes both from that history. It only answers for yourself
and for people applying to your jobs, who see your whole record rather than
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
| Payment issue              | -20    |

Badges describe habits, and nobody chooses them:

| Badge              | Earned by                                                 |
| ------------------ | --------------------------------------------------------- |
| Top Rated          | Averaging 4.5 stars or more over at least 3 reviews       |
| Reliable           | At least 3 jobs done, with no dropouts or no-shows        |
| Generous Colleague | Handing off at least 3 jobs                               |
| Serial Applicant   | Sending at least 10 applications                          |
| Serial Withdrawer  | Withdrawing at least 3, and a third of those sent or more |
| Unreliable         | Dropping out or not showing up at least twice             |
| Payment Issues     | At least 2 payment issues                                 |

Every number in these tables lives in `app_config`, so changing one needs no
release: the Ranks page reads them too, and fills them into its descriptions.
The fallbacks in `src/constants/index.js` should follow, and a test fails when
they don't.

## Pay and what was agreed

Passing on a job often means keeping part of the fee, so a job says what the
colleague would earn: a set amount, a range, or to be agreed. It's the colleague's
amount only, never the client's price or the sender's margin, and it lives in
`job_pay` rather than `jobs`, because jobs are public and broadcast by
realtime. Signed-in users can read it; visitors and clients can't.

Vaitu handles no money and takes no commission. It only keeps a record:

1. **Agreeing.** The organizer enters the amount when assigning the winner, or
   later, and the winner confirms it. A rejected amount can be proposed again; a
   confirmed one can't change (`job_agreements`).
2. **Settling.** From the job date, if the amount was confirmed and the job took
   place, each side says once whether it was settled (`job_settlements`). It never
   asks who owes whom, because the money can go either way.
3. **Replying.** A "no" notifies the other person, who has `settlement_reply_days`
   (14) to answer. Any answer from them, yes or no, makes it a disagreement that
   counts against nobody. With no answer it becomes a payment issue against them:
   `points_per_payment_issue` points, and the Payment Issues badge from
   `badge_payment_issues_min`.

Signed-in users can read the stats of organizers with an open job, so applicants
can see that badge too.

Next: [Moderation](moderation.md).
