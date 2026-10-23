import { createCropper } from "../../common/crop-dialog/index.js"
import { COVER_ASPECT_RATIO } from "../../constants/index.js"

// autoCreateEntities names the entity after the type.
export const COVER_CROPPER = "coverCropper"

export const CoverCropper = createCropper({
  label: "create.cropTitle",
  aspectRatio: COVER_ASPECT_RATIO,
})
