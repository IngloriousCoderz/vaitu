import { NOT_FOUND } from "../constants/index.js"
import { randomId } from "../text/index.js"
import { supabase } from "./client.js"

const EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export const EVENT_IMAGES_BUCKET = "event-images"
export const AVATARS_BUCKET = "avatars"

const BUCKETS = [EVENT_IMAGES_BUCKET, AVATARS_BUCKET]

export function imageExtension(type) {
  return EXTENSIONS[type] ?? null
}

export async function uploadEventImage(file) {
  return uploadImage(file, EVENT_IMAGES_BUCKET)
}

export async function uploadAvatar(file) {
  return uploadImage(file, AVATARS_BUCKET)
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

export function imageRefFromUrl(url) {
  if (typeof url !== "string") return null
  for (const bucket of BUCKETS) {
    const marker = `/${bucket}/`
    const index = url.indexOf(marker)
    if (index === NOT_FOUND) continue
    const [rawPath] = url.slice(index + marker.length).split(/[?#]/)
    if (!rawPath) return null
    return { bucket, path: decodeURIComponent(rawPath) }
  }
  return null
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
