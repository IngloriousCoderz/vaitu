import { pageRouteChange } from "@inglorious/web/router"

import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import { deleteAsk, deleteCancel, jobRemove, load } from "./handlers.js"
import { template } from "./template.js"

export const MyJobs = {
  deleteAsk,
  deleteCancel,
  ...load,
  ...jobRemove,
  ...template,

  create(entity) {
    entity.jobs ??= []
    entity.confirmingDelete ??= null
    entity.status ??= "idle"
    entity.error ??= null
  },

  routeChange: pageRouteChange({ open, close }),

  renderHeader() {
    return { title: t("myJobs.title") }
  },

  render(entity, api) {
    const id = entity.id
    return this.renderMyJobs({
      entity,
      onOpenJob: (job_id) =>
        api.notify("#router:navigate", paths.receivedApplications(job_id)),
      onEdit: (job_id) => api.notify("#router:navigate", paths.editJob(job_id)),
      onAskDelete: (job_id) => api.notify(`#${id}:deleteAsk`, job_id),
      onDelete: (job_id) => api.notify(`#${id}:jobRemove`, job_id),
      onCancelDelete: () => api.notify(`#${id}:deleteCancel`),
    })
  },
}

function open(entity, _, api) {
  api.notify(`#${entity.id}:load`)
}

function close(entity) {
  entity.confirmingDelete = null
}
