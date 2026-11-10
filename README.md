# Vaitu

**Vaitu** is an app for handing off jobs you can't take. Say you're a wedding photographer and you can't attend a wedding you've been booked for, or a cleaner who can't make Thursday's apartment: you publish the job on Vaitu, colleagues in your trade apply, and you pick the best candidate and pass the job on to them.

The name comes from the Italian "vai tu" ("you go"), but it's short, easy to pronounce and sounds good in other languages too.

## Features

- **Publish a job** you can't take, with all the details a colleague needs to decide.
- **Apply to jobs** as a professional, with a pre-filled profile.
- **Choose the best candidate** and pass the job to them.
- **Voice-to-form**: instead of filling in the whole job form by hand, record a voice message and the fields are filled in automatically. See [Voice AI](docs/voice-ai.md).
- **PWA and native apps**: runs in the browser as a PWA and as a hybrid Android/iOS app via Capacitor.
- **Notifications**: a bell in the app, and pushes to the browser and the phone even when the app is closed, for new jobs, applications, decisions and changes to jobs. See [Notifications](docs/notifications.md).
- **Reputation**: posters report how a job went and review the winner, which earns ranks and badges they see on applicants. See [Reputation](docs/reputation.md).

Vaitu started with wedding photographers in mind, and is expanding to other trades and kinds of job, such as sound technicians at a festival or cleaners looking after apartments, houses and offices.

## Tech stack

- **Frontend**: plain JavaScript and Vite, scaffolded with `@inglorious/create-app` and built on:
  - `@inglorious/web`: the web framework
  - `@inglorious/store`: state management
  - `@inglorious/ui`: component library
- **Mobile**: Capacitor (Android and iOS), plus PWA support
- **Backend**: Supabase (Postgres, Auth, Storage and Edge Functions)
- **AI**: Deepgram (transcription) and OpenRouter (field parsing)
- **Hosting**: Supabase Cloud (backend) and Vercel (frontend)

## Getting started

You need [pnpm](https://pnpm.io/), Docker Desktop (running) and the Supabase CLI (`brew install supabase/tap/supabase`).

1. **Install dependencies**:

   ```sh
   pnpm install
   ```

   This also installs the git hooks: before a commit, ESLint and Prettier run on the staged files; before a push, the type check and the unit tests run.

2. **Start the local backend**:

   ```sh
   supabase start            # first run pulls images, takes a few minutes
   supabase db reset --yes   # applies migrations + seed (poster + 11 jobs)
   ```

3. **Configure the frontend env**: copy the API URL and publishable key from `supabase status` into `.env.local` (not committed):

   ```
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=<publishable key from status>
   ```

4. **Start the development server**:

   ```sh
   pnpm dev
   ```

   Open the local URL it prints and sign in as `giada@vaitu.local` / `vaitu-local`.

## Documentation

Read in this order: each guide assumes the ones before it.

1. [Development](docs/development.md): the project layout, the local backend, test accounts, migrations and tests.
2. [Styling](docs/styling.md): where styles come from and how to override a component.
3. [Edge functions](docs/edge-functions.md): server-side code, secrets, and adding a function.
4. [Job taxonomy](docs/job-taxonomy.md): settings, professions and pickers, and how to change them.
5. [Voice AI](docs/voice-ai.md): the two providers behind voice-to-form.
6. [Notifications](docs/notifications.md): the bell, pushes through Firebase, and setting Firebase up.
7. [Reputation](docs/reputation.md): job reports, reviews, ranks and badges, and the history they rest on.
8. [Moderation](docs/moderation.md): reports, blocks and how to act on them.
9. [Analytics](docs/analytics.md): usage statistics, only with consent.
10. [Mobile](docs/mobile.md): running the Android and iOS apps.
11. [Deploying](docs/deploying.md): pushing the backend and the frontend to production.
12. [Releasing updates](docs/releasing-updates.md): how a new version reaches web and native users, and how to make it mandatory.
13. [Security](docs/security.md): how the data is guarded, the authorization tests and the ZAP scan, and what stays open on purpose.
