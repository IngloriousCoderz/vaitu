import { Form } from "@inglorious/web/form"

import {
  activateRealtime,
  deactivateRealtime,
  realtimeColumn,
} from "../../api/realtime.js"
import { pageRouteChange } from "../../common/page-route.js"
import { paths } from "../../routes.js"
import * as handlers from "./handlers.js"
import { Profile as renderers } from "./template.js"

const { profileLoad, profileSave, logout, ...syncHandlers } = handlers

export const Profile = {
  ...Form,
  ...syncHandlers,
  ...profileLoad,
  ...profileSave,
  ...logout,
  ...renderers,

  create(entity) {
    entity.profile ??= null
    entity.stats ??= null
    entity.isEditing ??= false
    entity.initialValues = {
      full_name: "",
      website: "",
      instagram_handle: "",
      country: "",
      region: "",
      favorite_regions: [],
    }
    Form.create(entity)
    entity.favoriteInput ??= ""
    entity.status ??= "idle"
    entity.error ??= null
    // The id is snapshotted because this closure outlives the batch that built
    // it: it fires from a realtime message, by which point the draft this
    // entity was is revoked and reading entity.id throws.
    const id = entity.id
    activateRealtime(id, {
      table: "applications",
      event: `#${id}:profileLoad`,
      match: (change, state) => {
        const applicantId = state[id]?.profile?.id
        return (
          applicantId != null &&
          realtimeColumn(change, "applicant_id") === applicantId
        )
      },
    })
  },

  destroy(entity) {
    deactivateRealtime(entity.id)
  },

  routeChange: pageRouteChange(open, close),

  renderHeader() {
    return { title: "Profile" }
  },

  render(entity, api) {
    const id = entity.id
    return this.renderProfile({
      entity,
      onCancel: () => api.notify(`#${id}:editCancel`),
      onField: ({ field, value }) =>
        api.notify(`#${id}:profileFieldSet`, { field, value }),
      onFavoriteInput: (value) => api.notify(`#${id}:favoriteInputSet`, value),
      onFavoriteAdd: (value) => api.notify(`#${id}:favoriteAdd`, value),
      onFavoriteRemove: (value) => api.notify(`#${id}:favoriteRemove`, value),
      onSave: () => api.notify(`#${id}:profileSave`, { ...entity.values }),
      onEdit: () => api.notify(`#${id}:editStart`),
      onLogout: () => api.notify(`#${id}:logout`),
      onOpenRanks: () => api.notify("#router:navigate", paths.ranks),
      onOpenApplications: (status) =>
        api.notify("#router:navigate", paths.applicationsByStatus(status)),
      renderCountry: () => api.render("country-profile"),
      renderRegion: () => api.render("region-profile"),
      renderFavoriteChoice: () => api.render("favorite-region-profile"),
    })
  },
}

function open(entity, _, api) {
  api.notify(`#${entity.id}:profileLoad`)
}

function close(entity) {
  entity.status = "idle"
  entity.error = null
  entity.isEditing = false
}
