# Security

Vaitu's data is guarded in the database, not in the app: whatever the app
hides, anyone with the public API key can ask Supabase for directly. This
guide covers how that guard is checked, what the November 2026 review found,
and what stays open on purpose.

## What protects the data

- **Row level security** on every table picks the rows a user can reach.
- **Column grants** pick the columns a user can write: a policy alone would
  let an owner rewrite any column of their own row.
- **Security definer functions** do everything that crosses users, such as
  assigning a winner or reviewing a job. Each one checks `auth.uid()` itself,
  and only the ones the app calls are granted to `authenticated`.
- **Edge functions** check the session, or the service role for the ones only
  the database calls (`push-notify`, `send-emails`).
- **Turnstile** on signup, login and resending the confirmation: Supabase Auth
  checks the token, so a script can't make accounts in bulk. See
  [Deploying](deploying.md#dashboard-settings-that-no-migration-can-set).
- **Daily limits** on what costs money or reaches other people: voice
  messages per user and in total (see [Voice AI](voice-ai.md#notes)), reports
  per user, and emails per day.
- **Security headers** in `vercel.json`: a content security policy, HSTS,
  `nosniff`, no framing, a referrer policy and a permissions policy that only
  allows the microphone.

## Checking it

### The authorization tests

`src/api/authorization.integration.test.js` runs with the other integration
tests (see [Development](development.md#useful-commands)). It signs in a poster, a
winner and a stranger, sets up a finished job between the first two, and
checks that:

- signed-out visitors and strangers read none of the private rows;
- nobody reads or writes the tables only the service uses;
- nobody but the service calls the internal functions;
- a stranger cannot act on someone else's job or application;
- the applicant cannot decide on their own application or write their
  account flags;
- the poster cannot hand off, undelete or fake the status of a job,
  take the job back from the winner, or read more of an applicant than their
  contact details;
- nobody lists other users' files, and the calendar bucket only takes
  calendars.

When you add a table or a function, add it to the lists at the top of that
file, or to the internal functions if the app must not call it.

### The ZAP scan

[ZAP](https://www.zaproxy.org/) attacks a running app the way a scanner on
the internet would. It runs on your machine against the local backend, so it
needs no staging environment and never touches production:

```sh
supabase start            # the local backend, seeded
pnpm security:scan
supabase db reset --yes   # the active scan leaves junk rows behind
```

The command builds the app against the local Supabase, serves it with the
production headers, and runs two scans in Docker at once:

- **App** (passive): crawls the pages, including the routes only JavaScript
  reaches, and checks headers, cookies and what the pages expose.
- **REST API** (active): signed in as `antony@vaitu.local`, it sends injection
  and other attacks to every table and function PostgREST lists for that user.
  The command checks that the session really reached the API: otherwise the
  scan only covers a signed-out visitor, and it fails.

It exits non-zero on any finding that is not accepted. The accepted ones are
in `scripts/zap/app-rules.tsv` and `scripts/zap/api-rules.tsv`, each with the
reason, and explained [below](#what-stays-open). The HTML reports land in
`.security-scan/`.

Most of the API scan's generic attacks end in a 400: PostgREST rejects what
does not follow its query syntax. The API scan also skips the DOM XSS rule:
it needs a page that runs scripts, and the browser it starts crashes the scan. It is a check against injection and leaky
errors, not against who can see what: the authorization tests cover that.

## What the review found

All fixed, in the initial migration and in production.

| Hole                                                                                     | What it allowed                                                                      |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| A poster could post a job already `assigned`, or set that status by hand                 | Earning the Generous Colleague badge with fake handoffs                              |
| A poster could switch the winner back to `rejected`                                      | Taking the job back, which also stopped the winner from reporting they were not paid |
| Anyone could list the storage buckets                                                    | Collecting every user id, and the calendars of every job, deleted ones included      |
| The calendar bucket took any file                                                        | Hosting HTML or scripts on the storage domain                                        |
| `check-email` rate-limited by the first `X-Forwarded-For` entry, which the caller writes | Unlimited checks of which emails have an account                                     |
| Posters could read an applicant's whole profile row                                      | Seeing last login, language and notification settings, not just contact details      |
| Calendar files stayed public forever                                                     | Reading a job's details long after it was deleted                                    |
| Deactivating left the images of the deleted jobs online                                  | Same, for images                                                                     |
| No security headers                                                                      | Framing the app, and no limit on where scripts could load from                       |

Calendars now go out as links that expire after a day, and applicants'
contact details come from `applicant_profiles()`.

## What stays open

These are known and accepted. The scan ignores the ones it reports.

| What                                                                     | Why it stays                                                                                                                                                                                                 |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `style-src 'unsafe-inline'` in the content security policy               | The templates bind inline styles. Scripts stay strict, and they are what an injection needs.                                                                                                                 |
| No `Cross-Origin-Embedder-Policy`                                        | It would block avatars and job images served by Supabase, and only matters for features Vaitu does not use.                                                                                                  |
| Static files without cache headers                                       | Nothing private in them.                                                                                                                                                                                     |
| The API misses `nosniff`, names its server version and allows any origin | Supabase's gateway sets these, not Vaitu. Any origin is how a public API key works: row level security does the guarding.                                                                                    |
| `check-email` tells whether an email has an account                      | The login flow needs it. It is limited to 20 checks per IP every 15 minutes.                                                                                                                                 |
| Anyone holding another device's push token can move it to their account  | The token only lives on that device, the taker only receives that device's pushes, and the next login there takes it back. Blocking it would break switching accounts on a phone.                            |
| Posters see an applicant's phone, website and country                    | That is how they get in touch.                                                                                                                                                                               |
| Someone determined can still make a few accounts by hand                 | Turnstile stops scripts, not people. The shared voice budget caps what they cost, and reports and blocking handle what they post.                                                                            |
| Reputation can be faked with a second account                            | Reviews come from whoever posted the job, so a poster can review their own second account. Nothing yet weighs a review by who wrote it.                                                                      |
| HSTS without `preload`                                                   | Preloading binds the whole domain to HTTPS for good, and is hard to undo.                                                                                                                                    |
| Analytics and push sign-up are not exercised by the local checks         | Their policy entries follow Google's and Firebase's documented domains. After changing the policy, accept analytics and turn on push on production, and look for "Refused to" errors in the browser console. |

## Adding something new

- **A table**: enable row level security, revoke what Supabase grants by
  default, and grant only the columns the client writes. Add it to the
  authorization tests.
- **A security definer function**: set `search_path`, check `auth.uid()`
  before anything else, and grant it only if the app calls it.
- **A storage bucket**: set its file types and size, and keep listing to the
  owner's folder.
- **A new external service in the app**: add its origin to the content
  security policy in `vercel.json`, or the browser will block it.
