import { Button } from "@inglorious/ui/button"
import { Dialog } from "@inglorious/ui/dialog"
import { Flex } from "@inglorious/ui/flex"
import { ImageCropper } from "@inglorious/ui/image-cropper"
import { html } from "@inglorious/web"

import { t } from "../../i18n/index.js"
import { ErrorAlert } from "../error-alert/index.js"
import styles from "./style.module.css"

// A cropper type locked to one shape and labelled in the current language.
// Register it on the store: autoCreateEntities names the entity after it.
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

// The dialog around a cropper entity. The page owns the file and whether the
// dialog is open; the cropper owns the frame, which `onApply` reads from it.
export const CropDialog = {
  render(
    {
      cropperId,
      title,
      description,
      applyLabel,
      error = null,
      isSaving = false,
      onCancel,
      onApply,
    },
    api,
  ) {
    const cropper = api.getEntity(cropperId)
    const isLoaded = cropper?.naturalWidth > 0
    const shownError =
      error ?? (cropper?.hasError ? t("errors.imageCrop") : null)

    return Dialog.render({
      isOpen: true,
      title,
      description,
      className: styles.cropDialog,
      onClose: onCancel,
      children: html`
        <div
          class=${styles.cropViewport}
          @keydown=${(event) => {
            if (event.key !== "Escape") return
            event.preventDefault()
            onCancel()
          }}
        >
          ${api.render(cropperId)}
        </div>
        ${ErrorAlert.render({ error: shownError, className: styles.error })}
      `,
      actions: Flex.render({
        justify: "end",
        align: "center",
        wrap: "nowrap",
        gap: "sm",
        className: styles.cropActions,
        children: [
          Button.render({
            children: t("common.cancel"),
            variant: "ghost",
            shape: "pill",
            size: "sm",
            isDisabled: isSaving,
            onClick: onCancel,
          }),
          Button.render({
            children: isSaving ? t("common.saving") : applyLabel,
            color: "primary",
            shape: "pill",
            size: "sm",
            isDisabled: isSaving || !isLoaded,
            onClick: () => onApply(cropper.rect),
          }),
        ],
      }),
    })
  },
}
