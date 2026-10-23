import { createCropper } from "../../common/crop-dialog/index.js"

// autoCreateEntities names the entity after the type.
export const AVATAR_CROPPER = "avatarCropper"

export const AvatarCropper = createCropper({
  label: "profile.cropTitle",
  aspectRatio: 1,
})
