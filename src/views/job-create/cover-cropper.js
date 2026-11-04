import { createCropper } from "../../common/cropper.js"
import { COVER_ASPECT_RATIO } from "../../constants/index.js"

export const COVER_CROPPER = "coverCropper"

export const CoverCropper = createCropper({
  label: "create.cropTitle",
  aspectRatio: COVER_ASPECT_RATIO,
})
