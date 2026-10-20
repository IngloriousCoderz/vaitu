import { randomId } from "../text/index.js"
import { supabase } from "./client.js"

export const EVENT_IMAGES_BUCKET = "event-images"
export const AVATARS_BUCKET = "avatars"

const BUCKETS = [EVENT_IMAGES_BUCKET, AVATARS_BUCKET]

const EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export function imageExtension(type) {
  return EXTENSIONS[type] ?? null
}

export async function uploadEventImage(file) {
  return uploadImage(file, EVENT_IMAGES_BUCKET)
}

export async function uploadAvatar(file) {
  return uploadImage(file, AVATARS_BUCKET)
}

async function uploadImage(file, bucket) {
  const extension = imageExtension(file.type)
  if (!extension) throw new Error("Unsupported image")
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")
  const path = `${user.id}/${randomId()}.${extension}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
  })
  if (error) throw error
  return {
    bucket,
    path,
    url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl,
  }
}

export async function deleteEventImage(path) {
  return deleteImage(path, EVENT_IMAGES_BUCKET)
}

export async function deleteAvatar(path) {
  return deleteImage(path, AVATARS_BUCKET)
}

export async function deleteImage(path, bucket) {
  if (!path || !bucket) return
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}

// Public URLs carry the bucket in the path. Reading it back means an avatar
// uploaded before the `avatars` bucket existed is still deleted from the bucket
// it actually lives in. External URLs (an OAuth picture, for example) return
// null and are left alone.
export function imageRefFromUrl(url) {
  if (typeof url !== "string") return null
  for (const bucket of BUCKETS) {
    const marker = `/${bucket}/`
    const index = url.indexOf(marker)
    if (index < 0) continue
    const rawPath = url.slice(index + marker.length).split(/[?#]/)[0]
    if (!rawPath) return null
    return { bucket, path: decodeURIComponent(rawPath) }
  }
  return null
}
