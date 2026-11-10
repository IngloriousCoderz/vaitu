import { readFileSync, writeFileSync } from "node:fs"

const SOURCE = "supabase/functions/_shared/job-taxonomy.json"
const SCHEMA = "supabase/migrations/20261028120000_initial_schema.sql"
const COPY = /\$taxonomy\$\n[\s\S]*?\n\$taxonomy\$/
const DATE_LENGTH = 8
const INDENTATION = 2

const taxonomy = JSON.stringify(
  JSON.parse(readFileSync(SOURCE, "utf8")),
  null,
  INDENTATION,
)
const copy = `$taxonomy$\n${taxonomy}\n$taxonomy$`

const schema = readFileSync(SCHEMA, "utf8")
if (!COPY.test(schema)) throw new Error(`No taxonomy copy found in ${SCHEMA}`)
writeFileSync(
  SCHEMA,
  schema.replace(COPY, () => copy),
)

const date = new Date().toISOString().replace(/\D/g, "").slice(0, DATE_LENGTH)
const snippet = `supabase/snippets/${date}_job_taxonomy.sql`
writeFileSync(
  snippet,
  `insert into public.job_taxonomy (id, taxonomy)
values (true, ${copy})
on conflict (id) do update set taxonomy = excluded.taxonomy;
`,
)

console.log(`Updated ${SCHEMA} and wrote ${snippet}.
Run the snippet in the SQL editor, locally and on production, then delete it.`)
