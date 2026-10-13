import { Alert } from "@inglorious/ui/alert"
import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"
import { IconButton } from "@inglorious/ui/icon-button"
import { Input } from "@inglorious/ui/input"
import { html } from "@inglorious/web"

import { renderPage } from "../../page.js"
import { Card } from "../event-card/index.js"
import { Icon } from "../icon/index.js"
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
    entity.events ??= []
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
    periods,
    query,
    activeFilter,
    activeRegion,
    activePeriod,
    favoriteRegions,
    isFiltersVisible,
    hasActiveFilters,
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
    const shown = visibleEvents(
      events,
      query,
      activeCategory,
      activeFilter,
      activeRegion,
      activePeriod,
      favoriteRegions,
    )

    return renderPage({
      variant: "sticky",
      category: activeCategory,
      children: [
        html`
          <div class=${styles.stickyTop}>
            <header class=${styles.header}>
              <span class=${styles.logo}
                >vaitu<span class=${styles.logoDot}>•</span></span
              >
              ${IconButton.render({
                icon: Icon.render({ name: "sliders" }),
                variant: "ghost",
                ariaLabel: "Filters",
                className: hasActiveFilters
                  ? `vaitu-compact ${styles.iconButton} ${styles.iconButtonActive}`
                  : `vaitu-compact ${styles.iconButton}`,
                onClick: onToggleFilters,
              })}
            </header>

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
                icon: Icon.render({ name: "search", size: 15 }),
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
                          icon: Icon.render({ name: "settings", size: 18 }),
                          ariaLabel: "Edit favorite regions",
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
          <main class=${styles.list}>
            ${
              status === "loading"
                ? html`<p class=${styles.empty}>Loading events…</p>`
                : status === "error"
                  ? html`<p class=${styles.empty}>${error}</p>`
                  : !shown.length
                    ? html`<p class=${styles.empty}>
                        No events match your search yet.
                      </p>`
                    : shown.map((event) =>
                        Card.render({
                          event,
                          isApplied: Boolean(appliedMap[event.id]),
                          onOpen: onOpenEvent,
                        }),
                      )
            }
          </main>
        `,
      ],
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
    const draft = favoriteDraft ?? []
    const typed = favoriteInput ?? ""
    const saving = favoritesStatus === "saving"
    return html`
      <div class=${styles.favoriteEditor}>
        ${
          draft.length
            ? html`
                <div class=${styles.favoriteChips}>
                  ${draft.map(
                    (region) => html`
                      <span class=${styles.favoriteChip}>
                        ${region}
                        <button
                          class=${styles.favoriteRemove}
                          type="button"
                          aria-label=${`Remove ${region}`}
                          @click=${() => onFavoriteRemove(region)}
                        >
                          ${Icon.render({ name: "x", size: 13 })}
                        </button>
                      </span>
                    `,
                  )}
                </div>
              `
            : ""
        }
        ${renderFavoriteChoice()}
        ${Input.render({
          inputType: "text",
          isFullWidth: true,
          placeholder: "Or type a region",
          value: typed,
          onChange: (value) => onFavoriteInput(value),
        })}
        ${Button.render({
          children: "Add",
          variant: "outline",
          shape: "pill",
          size: "md",
          isFullWidth: true,
          isDisabled: typed.trim() === "" || saving,
          onClick: () => onFavoriteAdd(typed),
        })}
        ${
          favoritesError
            ? Alert.render({
                severity: "error",
                className: "vaitu-alert",
                children: favoritesError,
              })
            : ""
        }
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
