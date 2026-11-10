# Voice AI (transcription + field parsing)

Voice-to-form records a message on the job form, turns it into text, and
fills the fields from the text. Two [edge functions](edge-functions.md) do the
work, each backed by an external provider.

| Step                    | Provider   | Function           | Model                       |
| ----------------------- | ---------- | ------------------ | --------------------------- |
| Speech-to-text          | Deepgram   | `transcribe-audio` | `nova-3`                    |
| Transcript → job fields | OpenRouter | `parse-job`        | The free models in `MODELS` |

The app sends its language with the recording. Deepgram is told that language,
which gets names right more often than detecting it does. Arabic and anything
else are detected instead (`language=multi`), because `language=ar` returned an
empty transcript on `nova-3`. So someone who speaks a different language from
the app's may get a poor transcript.

## One schema, every job type

`parse-job/schema.ts` builds the prompt from the [job taxonomy](job-taxonomy.md):
a wedding has spouses, styles, parts of the day and genres, a festival or
concert a name, a headliner and genres, and an apartment, house or office job
a title and nothing else. The app sends the job
type the form is on and those it offers. The model keeps the first unless the
message clearly describes another of them, and `toJobFields` drops anything
that isn't a valid value for the result, whatever the model answered:

```json
{
  "job_type": "festival_dj",
  "title": "Sundance Beats",
  "location": "Parco Sempione",
  "country": "Italy",
  "region": "Lombardy",
  "job_date": "2027-07-03",
  "details": { "headliner": "Ada", "genres": ["techno"] },
  "pay": {
    "kind": "fixed",
    "amount_min": 500,
    "amount_max": null,
    "currency": "EUR"
  }
}
```

For property jobs the prompt asks for a neighborhood or town instead of a street
address, since jobs are public. That rests on the model, so the form's hint
says the same.

The schema is a copy of the taxonomy and the create form, because a function
can't import app code. When you add a job type, a style or a form field,
`src/views/job-create/parse-job.test.js` fails until the copy follows.

## Keys

Both providers are currently on personal test keys. The keys go in
`supabase/functions/.env` (NOT `.env.local` — that one is only for the
frontend). The file is gitignored, never committed, and functions
hot-reload it — no restart needed:

```
DEEPGRAM_API_KEY=<from console.deepgram.com → Project → API Keys>
OPENROUTER_API_KEY=<from openrouter.ai → Keys>
```

In production they are set with `supabase secrets set` (see
[Deploying](deploying.md)).

## Limit alerts

When a provider answers that a limit was reached, `_shared/alerts.ts` emails
`ALERT_EMAIL` through Resend: OpenRouter's `402`, `429` and `404` (all the free
models withdrawn), and Deepgram's `402` and `429`. Other errors stay quiet. The
`alert_log` table allows one email a day per provider, and a send that fails
gives its slot back. The user just sees the usual error, and an alert that can't
be sent never changes that.

`RESEND_API_KEY` and `ALERT_EMAIL` go in `supabase/functions/.env`, and in
production with `supabase secrets set`, because functions can't read Vercel's
variables. Emails come from `onboarding@resend.dev`, which Resend only delivers
to its account's own address. To send to any other, verify a domain on Resend and
set `ALERT_FROM`, such as `Vaitu <alerts@vaitu.net>`.

## Troubleshooting

- `500 "DEEPGRAM_API_KEY is not set"` → key in the wrong `.env`.
- `401 INVALID_AUTH from Deepgram` → the key itself is bad: regenerate
  it in the Deepgram console (copy the full value, no spaces, no quotes)
  and replace it.
- Free OpenRouter models rotate and rate-limit. `parse-job` lists several in
  `MODELS`, and OpenRouter moves down the list when one fails. If they all fail
  (`404` or `429`), update the list from `openrouter.ai/api/v1/models`.

## Notes

- On iOS, the microphone needs `NSMicrophoneUsageDescription` in
  `ios/App/App/Info.plist`. Android needs `RECORD_AUDIO` in its manifest.
- Recordings are never stored: the app sends them in the request and the
  function only holds them in memory. Nor is the transcript kept: it only fills
  the form.
- Each user has `voice_daily_limit` transcriptions and parses a day, in
  `app_config`. A failed attempt is given back. Above the limit the functions
  answer `429 voice_limit` without calling a provider.
- Everyone together has `voice_daily_minutes` of transcription a day, the
  ceiling on the Deepgram bill however many accounts there are. Each
  transcription adds the duration Deepgram reports to `voice_usage.seconds`.
  Once the minutes are used, `transcribe-audio` answers `429 voice_paused`
  until midnight UTC, and `ALERT_EMAIL` hears about it once a day. Raise the
  number in `app_config` with no release.
- `transcribe-audio` takes at most 3 MB. The app records 2 minutes at most, at
  64 kbps, so it stays under 1 MB; the cap keeps a direct call from sending
  most of an hour of low-bitrate audio.
- Parsing has no shared budget: the models are free, so abuse can only run
  out OpenRouter's free allowance, which the limit alerts report.
- Local Whisper was evaluated and dropped: worse on Italian proper nouns
  plus a ~150MB model download per device.

Next: [Notifications](notifications.md).
