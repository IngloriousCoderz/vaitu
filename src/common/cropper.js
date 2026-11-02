import { ImageCropper } from "@inglorious/ui/image-cropper"

import { t } from "../i18n/index.js"

export function createCropper({ label, aspectRatio }) {
  return {
    ...ImageCropper,
    create(entity) {
      entity.aspectRatio ??= aspectRatio
      ImageCropper.create(entity)
    },
    render(entity, api) {
      return ImageCropper.render.call(this, { ...entity, label: t(label) }, api)
    },
  }
}
