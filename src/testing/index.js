import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"

import { createClient } from "@supabase/supabase-js"

import { supabase } from "../api/client.js"
import { createJob, deleteJob } from "../api/jobs.js"
import { DAY_MS } from "../constants/index.js"

const DEADLINE_IN_DAYS = 7

// Every account has this password: the two in supabase/seed.sql and those the
// tests sign up.
export const PASSWORD = "vaitu-local"
export const GIADA = { email: "giada@vaitu.local", password: PASSWORD }
export const ANTONY = { email: "antony@vaitu.local", password: PASSWORD }

export async function signIn(account) {
  const { error } = await supabase.auth.signInWithPassword(account)
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut({ scope: "local" })
  if (error) throw error
}

export function pastDeadline() {
  return new Date(Date.now() - DAY_MS).toISOString()
}

export function jobPayload(id, deadline) {
  return {
    category: "wedding",
    profession: "photographer",
    title: `Vitest ${id}`,
    location: "Florence",
    country: "Italy",
    region: "Tuscany",
    job_date: "2027-06-01",
    application_deadline:
      deadline ??
      new Date(Date.now() + DEADLINE_IN_DAYS * DAY_MS).toISOString(),
    details: {
      style: "editorial",
      spouse_first_name_1: `Ada${id}`,
      spouse_first_name_2: `Ben${id}`,
    },
  }
}

export function coupleTitle(id) {
  return `Ada${id} & Ben${id}`
}

export async function createJobAs(account, id, deadline, fields) {
  await signIn(account)
  const payload = { ...jobPayload(id, deadline), ...fields }
  await createJob(payload)
  const jobId = await ownedJobId(payload.title)
  if (!jobId) throw new Error("Created job was not found")
  return jobId
}

export async function deleteOwnedJob(jobId) {
  await signIn(ANTONY)
  await deleteJob(jobId)
}

export async function deleteOwnedJobByTitle(title) {
  await signIn(ANTONY)
  const jobId = await ownedJobId(title)
  if (!jobId) return
  await deleteJob(jobId)
}

export async function setJobDate(jobId, job_date) {
  const { error } = await serviceRoleClient()
    .from("jobs")
    .update({ job_date })
    .eq("id", jobId)
  if (error) throw error
}

export async function readJobAsService(jobId) {
  const { data, error } = await serviceRoleClient()
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function issueErasureLink(user_id) {
  const token = crypto.randomUUID()
  const { error } = await serviceRoleClient()
    .from("account_erasures")
    .insert({
      token_hash: createHash("sha256").update(token).digest("hex"),
      user_id,
    })
  if (error) throw error
  return token
}

export async function readAsService(table, column, value) {
  const { data, error } = await serviceRoleClient()
    .from(table)
    .select("*")
    .eq(column, value)
  if (error) throw error
  return data
}

export async function userExists(userId) {
  const { data } = await serviceRoleClient().auth.admin.getUserById(userId)
  return Boolean(data?.user)
}

export async function updateAsService(table, column, value, fields) {
  const { error } = await serviceRoleClient()
    .from(table)
    .update(fields)
    .eq(column, value)
  if (error) throw error
}

export async function runAsService(fn, params) {
  const { data, error } = await serviceRoleClient().rpc(fn, params)
  if (error) throw error
  return data
}

export async function signUp({ email, fullName }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: PASSWORD,
    options: { data: { full_name: fullName } },
  })
  if (error) throw error
  const { error: confirmError } =
    await serviceRoleClient().auth.admin.updateUserById(data.user.id, {
      email_confirm: true,
    })
  if (confirmError) throw confirmError
  return data.user.id
}

export async function deleteSignedUpUser(userId) {
  const { error } = await serviceRoleClient().auth.admin.deleteUser(userId)
  if (error) throw error
}

export async function deleteCheckEmailLimit(ipHash) {
  const { error } = await serviceRoleClient()
    .from("check_email_rate_limits")
    .delete()
    .eq("ip_hash", ipHash)
  if (error) throw error
}

export async function removeStoredFile(bucket, path) {
  const { error } = await serviceRoleClient()
    .storage.from(bucket)
    .remove([path])
  if (error) throw error
}

async function ownedJobId(title) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!user) throw new Error("Not logged in")
  const { data, error } = await supabase
    .from("jobs")
    .select("id")
    .eq("title", title)
    .eq("sender_id", user.id)
    .maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

function serviceRoleClient() {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    localServiceRoleKey(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export function localServiceRoleKey() {
  const output = execFileSync("supabase", ["status", "-o", "env"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  })
  const [, quoted, bare] =
    output.match(/^SERVICE_ROLE_KEY=(?:"([^"]+)"|(\S+))$/m) ?? []
  const key = quoted ?? bare
  if (!key) throw new Error("supabase status did not return a service role key")
  return key
}
