# Voice AI (transcription + field parsing)

Voice-to-form records a message on the event form, turns it into text, and
fills the fields from the text. Two [edge functions](edge-functions.md) do the
work, each backed by an external provider.

| Step                      | Provider   | Function           | Model                                    |
| ------------------------- | ---------- | ------------------ | ---------------------------------------- |
| Speech-to-text (Italian)  | Deepgram   | `transcribe-audio` | `nova-3` (`language=it`)                 |
| Transcript → event fields | OpenRouter | `parse-event`      | `nvidia/nemotron-3-super-120b-a12b:free` |

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

## Troubleshooting

- `500 "DEEPGRAM_API_KEY is not set"` → key in the wrong `.env`.
- `401 INVALID_AUTH from Deepgram` → the key itself is bad: regenerate
  it in the Deepgram console (copy the full value, no spaces, no quotes)
  and replace it.
- Free OpenRouter models rotate and rate-limit (`429` = swap `MODEL` in
  `parse-event/index.ts` for another `:free` one from
  `openrouter.ai/api/v1/models`).

## Notes

- Audio stays in the `event-audio` bucket (one file per event, replaced
  or deleted with the event); only the transcript fills the form.
- Local Whisper was evaluated and dropped: worse on Italian proper nouns
  plus a ~150MB model download per device.

Next: [Mobile](mobile.md).
