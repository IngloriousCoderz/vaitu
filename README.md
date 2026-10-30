# Vaitu

**Vaitu** is an app for handing off jobs you can't take. Say you're a wedding photographer and you can't attend a wedding you've been booked for: you publish the event on Vaitu, other photographers apply, and you pick the best candidate and pass the job on to them.

The name comes from the Italian "vai tu" ("you go"), but it's short, easy to pronounce and sounds good in other languages too.

## Features

- **Publish an event** you can't attend, with all the details a colleague needs to decide.
- **Apply to events** as a professional, with a pre-filled profile.
- **Choose the best candidate** and pass the job to them.
- **Voice-to-form**: instead of filling in the whole event form by hand, record a voice message and the fields are filled in automatically. See [Voice AI](docs/voice-ai.md).
- **PWA and native apps**: runs in the browser as a PWA and as a hybrid Android/iOS app via Capacitor.
- **Notifications**: a bell in the app, and pushes to the browser and the phone even when the app is closed, for applications, decisions and changes to events. See [Notifications](docs/notifications.md).

Vaitu started with wedding photographers in mind, and is expanding to other kinds of professionals and events, such as sound technicians at a festival.

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

   This also installs the git hooks: before a commit, ESLint and Prettier run on the staged files; before a push, the unit tests run.

2. **Start the local backend**:

   ```sh
   supabase start            # first run pulls images, takes a few minutes
   supabase db reset --yes   # applies migrations + seed (sender + 8 events)
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

   Open the local URL it prints and sign in as `sender@vaitu.local` / `test1234`.

## Documentation

Read in this order: each guide assumes the ones before it.

1. [Development](docs/development.md): the project layout, the local backend, test accounts, migrations and tests.
2. [Styling](docs/styling.md): where styles come from and how to override a component.
3. [Edge functions](docs/edge-functions.md): server-side code, secrets, and adding a function.
4. [Voice AI](docs/voice-ai.md): the two providers behind voice-to-form.
5. [Notifications](docs/notifications.md): the bell, pushes through Firebase, and setting Firebase up.
6. [Analytics](docs/analytics.md): usage statistics, only with consent.
7. [Mobile](docs/mobile.md): running the Android and iOS apps.
8. [Deploying](docs/deploying.md): pushing the backend and the frontend to production.
9. [Releasing updates](docs/releasing-updates.md): how a new version reaches web and native users, and how to make it mandatory.
