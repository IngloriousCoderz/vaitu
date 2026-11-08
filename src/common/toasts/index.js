import { Toast } from "@inglorious/ui/toast"

import { t } from "../../i18n/index.js"

/**
 * The toasts over every page: news that arrives while the app is open. A
 * toast can carry the notification it stands for, which opening it marks as
 * read, and the page it leads to.
 */
export const Toasts = {
  ...Toast,

  open(entity, id, api) {
    const toast = entity.toasts.find((item) => item.id === id)
    if (!toast) return
    Toast.close(entity, id)
    if (toast.notificationId) {
      api.notify("#notifications:readSet", toast.notificationId)
    }
    if (toast.path) api.notify("#router:navigate", toast.path)
  },

  sessionEnd(entity) {
    Toast.clear(entity)
  },

  render(entity, api) {
    return Toast.render.call(
      this,
      { ...entity, dismissLabel: t("common.close") },
      api,
    )
  },
}
