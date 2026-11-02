import { createCropper } from "../../common/cropper.js"

export const AVATAR_CROPPER = "avatarCropper"

export const AvatarCropper = createCropper({
  label: "profile.cropTitle",
  aspectRatio: 1,
})
