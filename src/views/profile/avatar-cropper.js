import { createCropper } from "../../common/crop-dialog/index.js"

export const AVATAR_CROPPER = "avatarCropper"

export const AvatarCropper = createCropper({
  label: "profile.cropTitle",
  aspectRatio: 1,
})
