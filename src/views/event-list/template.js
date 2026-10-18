import { Button } from "@inglorious/ui/button"
import { ButtonGroup } from "@inglorious/ui/button-group"
import { Chip } from "@inglorious/ui/chip"
import { Flex } from "@inglorious/ui/flex"
import { IconButton } from "@inglorious/ui/icon-button"
import { Input } from "@inglorious/ui/input"
import { MaterialIcon } from "@inglorious/ui/material-icon"
import { html } from "@inglorious/web"

import { ConfirmPrompt } from "../../common/confirm-prompt/index.js"
import { ErrorAlert } from "../../common/error-alert/index.js"
import { Card } from "../../common/event-card/index.js"
import { FavoriteRegions } from "../../common/favorite-regions/index.js"
import { Page } from "../../common/page/index.js"
import { PageStatus } from "../../common/page-status/index.js"
import { StatusChip } from "../../common/status-chip/index.js"
import { LIST_STAGGER_CAP, SINGULAR } from "../../constants/index.js"
import { visibleEvents } from "./helpers.js"
import styles from "./style.module.css"

export const EventList = {
  create(entity) {
    entity.query ??= ""
    entity.activeCategory ??= "wedding"
    entity.activeFilter ??= "all"
    entity.activeRegion ??= "all"
    entity.activePeriod ??= "all"
    entity.isFiltersVisible ??= false
    entity.activeOwner ??= "explore"
    entity.events ??= []
    entity.myEvents ??= []
    entity.confirmingDelete ??= null
    entity.appliedMap ??= {}
    entity.favoriteRegions ??= []
    entity.isEditingFavorites ??= false
    entity.favoriteDraft ??= []
    entity.favoriteInput ??= ""
    entity.favoritesStatus ??= "idle"
    entity.favoritesError ??= null
    entity.status ??= "loading"
    entity.error ??= null
  },

  render(props, api) {
    return this.renderEventList(props, api)
  },

  renderEventList({
    events,
    myEvents,
    myEventIds,
    activeOwner,
    confirmingDelete,
    appliedMap,
    status,
    error,
    categories,
    activeCategory,
    filters,
    regions,
    isEditingFavorites,
    favoriteDraft,
    favoriteInput,
    favoritesStatus,
    favoritesError,
    owners,
    periods,
    query,
    activeFilter,
    activeRegion,
    activePeriod,
    favoriteRegions,
    isFiltersVisible,
    onSelectOwner,
    onEdit,
    onAskDelete,
    onDelete,
    onCancelDelete,
    onSearch,
    onSelectCategory,
    onSelectFilter,
    onToggleFilters,
    onSelectRegion,
    onEditFavorites,
    onCancelFavorites,
    onFavoriteInput,
    onFavoriteAdd,
    onFavoriteRemove,
    onSaveFavorites,
    renderFavoriteChoice,
    onSelectPeriod,
    onClearFilters,
    onOpenEvent,
  }) {
    const isMine = activeOwner === "mine"
    const shown = visibleEvents(
      isMine ? myEvents : events.filter((event) => !myEventIds.has(event.id)),
      query,
      activeCategory,
      activeFilter,
      activeRegion,
      activePeriod,
      favoriteRegions,
    )

    return Page.render({
      variant: "sticky",
      category: activeCategory,
      wide: true,
      children: [
        html`
          <div class=${styles.stickyTop}>
            <div class=${styles.ownerSwitch}>
              ${ButtonGroup.render({
                buttons: owners.map((owner) =>
                  owner.id === activeOwner
                    ? { value: owner.id, label: owner.label, color: "primary" }
                    : {
                        value: owner.id,
                        label: owner.label,
                        variant: "outline",
                      },
                ),
                value: activeOwner,
                size: "sm",
                onChange: onSelectOwner,
              })}
            </div>

            <div class=${styles.categoryRow}>
              ${categories.map(
                (category) => html`
                  <button
                    type="button"
                    class=${
                      category.id === activeCategory
                        ? `${styles.categoryButton} ${styles.categoryActive}`
                        : styles.categoryButton
                    }
                    @click=${() => onSelectCategory(category.id)}
                  >
                    ${category.label}
                  </button>
                `,
              )}
            </div>

            <div class="vaitu-search">
              ${Input.render({
                inputType: "search",
                isFullWidth: true,
                placeholder: "Find events by city, style or genre...",
                value: query,
                icon: MaterialIcon.render({ name: "search", size: "lg" }),
                onChange: (value) => onSearch(value),
              })}
            </div>

            ${this.renderChipRow({
              items: filters,
              activeId: activeFilter,
              onSelect: onSelectFilter,
              getLabel: (filter) => filter.label,
            })}
          </div>
          ${
            isFiltersVisible
              ? html`
                  <div class=${styles.backdrop} @click=${onToggleFilters}>
                    <div
                      class=${styles.sheet}
                      @click=${(e) => e.stopPropagation()}
                    >
                      <div class=${styles.sheetHeading}>
                        <h3 class=${styles.sheetTitle}>Region</h3>
                        ${IconButton.render({
                          icon: MaterialIcon.render({
                            name: "settings",
                            size: "lg",
                          }),
                          ariaLabel: "Edit favorite regions",
                          variant: "ghost",
                          color: "secondary",
                          className: styles.sheetGear,
                          onClick: onEditFavorites,
                        })}
                      </div>
                      ${
                        isEditingFavorites
                          ? this.renderFavoriteEditor({
                              renderFavoriteChoice,
                              favoriteDraft,
                              favoriteInput,
                              favoritesStatus,
                              favoritesError,
                              onCancelFavorites,
                              onFavoriteInput,
                              onFavoriteAdd,
                              onFavoriteRemove,
                              onSaveFavorites,
                            })
                          : ""
                      }
                      ${this.renderChipRow({
                        items: regions,
                        activeId: activeRegion,
                        onSelect: onSelectRegion,
                        getLabel: (item) => item.label,
                      })}
                      <h3 class=${styles.sheetTitle}>Period</h3>
                      ${this.renderChipRow({
                        items: periods,
                        activeId: activePeriod,
                        onSelect: onSelectPeriod,
                        getLabel: (period) => period.label,
                      })}
                      ${Button.render({
                        children: "Clear all",
                        variant: "ghost",
                        isFullWidth: true,
                        onClick: onClearFilters,
                      })}
                    </div>
                  </div>
                `
              : ""
          }
          <main class="${styles.list} vaitu-list">
            ${
              PageStatus.render({
                isError: status === "error",
                error,
                isLoading: status === "loading",
                loadingText: "Loading events…",
                isEmpty: !shown.length,
                emptyText:
                  isMine && !myEvents.length
                    ? "You haven't posted any event yet."
                    : "No events match your search yet.",
              }) ??
              shown.map((event, index) => {
                const style = `--vaitu-list-index:${Math.min(index, LIST_STAGGER_CAP)}`
                return isMine
                  ? this.renderMyEvent({
                      event,
                      style,
                      isConfirmingDelete: confirmingDelete === event.id,
                      onOpenEvent,
                      onEdit,
                      onAskDelete,
                      onDelete,
                      onCancelDelete,
                    })
                  : Card.render({
                      event,
                      isApplied: Boolean(appliedMap[event.id]),
                      onOpen: onOpenEvent,
                      cover: true,
                      className: `vaitu-list-item ${styles.tile}`,
                      style,
                    })
              })
            }
          </main>
        `,
      ],
    })
  },

  renderMyEvent({
    event,
    style,
    isConfirmingDelete,
    onOpenEvent,
    onEdit,
    onAskDelete,
    onDelete,
    onCancelDelete,
  }) {
    return Flex.render({
      direction: "column",
      className: `${styles.myEvent} vaitu-list-item`,
      style,
      children: [
        Card.render({
          event,
          divider: false,
          cover: true,
          onOpen: onOpenEvent,
        }),
        html`
          <div class=${styles.myEventFooter}>
            ${StatusChip.render({ status: event.status })}
            <span class=${styles.count}>
              ${event.applications_count}
              application${event.applications_count === SINGULAR ? "" : "s"}
            </span>
            <span class=${styles.rowActions}>
              ${
                event.status === "open"
                  ? IconButton.render({
                      icon: MaterialIcon.render({ name: "edit", size: "lg" }),
                      ariaLabel: "Edit event",
                      className: `${styles.miniButton} ${styles.editTint}`,
                      onClick: () => onEdit(event.id),
                    })
                  : ""
              }
              ${IconButton.render({
                icon: MaterialIcon.render({ name: "delete", size: "lg" }),
                ariaLabel: "Delete event",
                className: `${styles.miniButton} ${styles.deleteTint}`,
                onClick: () => onAskDelete(event.id),
              })}
            </span>
          </div>
        `,
        isConfirmingDelete
          ? ConfirmPrompt.render({
              message: "Delete this event and all its applications?",
              confirmLabel: "Yes, delete",
              className: styles.confirm,
              onConfirm: () => onDelete(event.id),
              onCancel: onCancelDelete,
            })
          : "",
      ],
    })
  },

  renderHeaderActions({ hasActiveFilters, onToggleFilters }) {
    return IconButton.render({
      icon: MaterialIcon.render({ name: "instant_mix", size: "lg" }),
      variant: "ghost",
      color: "secondary",
      ariaLabel: "Filters",
      className: hasActiveFilters ? styles.filterActive : "",
      onClick: onToggleFilters,
    })
  },

  renderFavoriteEditor({
    renderFavoriteChoice,
    favoriteDraft,
    favoriteInput,
    favoritesStatus,
    favoritesError,
    onCancelFavorites,
    onFavoriteInput,
    onFavoriteAdd,
    onFavoriteRemove,
    onSaveFavorites,
  }) {
    const saving = favoritesStatus === "saving"
    return html`
      <div class=${styles.favoriteEditor}>
        ${FavoriteRegions.render({
          regions: favoriteDraft ?? [],
          input: favoriteInput ?? "",
          inputId: "list-favorite-region",
          isDisabled: saving,
          onInput: onFavoriteInput,
          onAdd: onFavoriteAdd,
          onRemove: onFavoriteRemove,
          renderChoice: renderFavoriteChoice,
        })}
        ${ErrorAlert.render({ error: favoritesError })}
        ${Button.render({
          children: saving ? "Saving…" : "Save regions",
          color: "primary",
          shape: "pill",
          size: "md",
          isFullWidth: true,
          isDisabled: saving,
          onClick: onSaveFavorites,
        })}
        ${Button.render({
          children: "Cancel",
          variant: "ghost",
          isFullWidth: true,
          isDisabled: saving,
          onClick: onCancelFavorites,
        })}
      </div>
    `
  },

  renderChipRow({ items, activeId, onSelect, getLabel }) {
    return html`
      <div class=${styles.chips}>
        ${items.map(
          (item) => html`
            <button
              type="button"
              class=${styles.chipButton}
              @click=${() => onSelect(item.id)}
            >
              ${Chip.render({
                children: getLabel(item),
                color: item.id === activeId ? "primary" : "default",
              })}
            </button>
          `,
        )}
      </div>
    `
  },
}
