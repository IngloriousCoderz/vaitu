# Job taxonomy

The taxonomy says which jobs exist and what a job can say about itself: the
settings (weddings, festivals…), the professions working in each, and the
pickers a job has, like styles, parts of the day and genres, with their
options. It lives in one file,
`supabase/functions/_shared/job-taxonomy.json`, which three places read:

| Reader      | Where                                                            | What for                                    |
| ----------- | ---------------------------------------------------------------- | ------------------------------------------- |
| The app     | `src/data/job-taxonomy.js`, `src/views/job-list/job-settings.js` | The create form, filters, job cards         |
| `parse-job` | `supabase/functions/parse-job/schema.ts`                         | The model's prompt, and checking its answer |
| Postgres    | The `job_taxonomy` table, a copy kept in the initial migration   | Refusing jobs the form would not allow      |

## The file

```json
{
  "settingsByProfession": { "dj": ["wedding", "festival"] },
  "settings": {
    "wedding": {
      "textFields": ["spouse_first_name_1", "spouse_first_name_2"],
      "isTitled": false,
      "isHome": false,
      "details": {
        "styles": ["photographer", "videographer"],
        "genres": ["musician", "dj"]
      }
    },
    "festival": {
      "textFields": ["headliner"],
      "isTitled": true,
      "isHome": false,
      "details": { "genres": null }
    }
  },
  "options": {
    "genres": [
      {
        "value": "jazz",
        "labels": {
          "en": "Jazz",
          "it": "Jazz",
          "fr": "Jazz",
          "ar": "جاز",
          "ja": "ジャズ"
        }
      }
    ]
  }
}
```

- `settingsByProfession`: the settings each profession works in. Each pair is a
  job type, like `wedding_dj`.
- `textFields`: the setting's free-text fields. Their labels are
  `fields.<field>` in the locale files.
- `isTitled`: whether its jobs have a title of their own. A wedding's comes
  from the spouses' names instead.
- `isHome`: someone's home, so the location stays a neighborhood or a town.
- `details`: the setting's pickers, each with the professions it is for, or
  `null` for every profession.
- `options`: each picker's values. An option brings its own labels, one per
  locale file, shown with `localized()`.

## Changing options

To add, relabel, reorder or remove a genre, a style or a part of the day:

1. Edit `options` in the JSON. Give every option a label in all five locales:
   the unit tests fail otherwise.
2. Run `pnpm taxonomy:snippet`. It rewrites the copy in the initial
   migration, so a reset database has it, and writes
   `supabase/snippets/<date>_job_taxonomy.sql`, which updates a database that
   already exists.
3. Run the snippet in the local SQL editor, at http://127.0.0.1:54323, and
   `pnpm test`. The integration tests fail when the database's copy and the
   file differ, so a forgotten snippet shows up there.
4. Ship it in the order below, then delete the snippet.

A `value` is what jobs store, so never change one: to rename an option, change
its labels. A removed value stays on the jobs that have it, shown as it is
written, and editing such a job fails until it is unpicked.

### Shipping order

Pushing to `main` ships the app (Vercel and the live update), and the snippet,
run in production's SQL editor, the database's copy. The database refuses
values it does not know, so whichever adds a value goes first:

- **Adding an option**: the snippet, then
  `supabase functions deploy parse-job`, then push to `main`. In the other
  order, a job posted with the new option fails until the database has it.
- **Removing an option**: push to `main` first, so the form stops offering it,
  then the snippet and `supabase functions deploy parse-job`.
- **Labels or order only**: any order. The database checks values, not labels.

## Adding a setting or a profession

On top of the steps above:

- A profession goes in `settingsByProfession`, with its label in
  `taxonomy.profession.<id>` in the locale files.
- A setting goes in `settings` and in `settingsByProfession`, with its label in
  `taxonomy.setting.<id>` and its text fields' in `fields.<field>`. The
  `jobs.setting` check constraint lists the settings too: change it as in
  [Deploying](deploying.md#small-schema-changes).
- The app offers only the settings in `OFFERED_SETTINGS`, in
  `src/data/job-taxonomy.js`.

## Adding a kind of picker

A new picker, besides `styles`, `moments` and `genres`, needs code as well:
its options in `options`, its entry in the `details` of each setting that has
it, and its definition in `src/views/job-list/job-settings.js`, with its
filter title and form label in the locale files.
