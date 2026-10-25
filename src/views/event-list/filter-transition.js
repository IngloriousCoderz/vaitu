const FILTER_EDITOR = "filter-editor"
const SHEET = "filter-sheet"

// The page transitions tag a navigation and let the package stylesheet slide
// the root. Opening the favorite editor is not a navigation, so it gets its
// own type: the root stays put and the sheet grows.
export function withFilterTransition(update) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const canStart = typeof document.startViewTransition === "function"
  if (reduce || !canStart) {
    update()
    return
  }

  const root = document.documentElement
  holdChromeNames()
  root.classList.add("vaitu-filter-transition")

  const finish = () => {
    root.classList.remove("vaitu-filter-transition")
    releaseChromeNames()
  }

  const run = () => {
    update()
    // A re-render can mint a new bar or drawer. The new snapshot is taken
    // after this returns, so the names have to be off on those nodes too.
    holdChromeNames()
  }

  let transition
  try {
    if (
      typeof ViewTransition !== "undefined" &&
      "types" in ViewTransition.prototype
    ) {
      transition = document.startViewTransition({
        update: run,
        types: [FILTER_EDITOR],
      })
    } else {
      transition = document.startViewTransition(run)
    }
  } catch {
    finish()
    update()
    return
  }

  transition.finished.finally(finish)
}

// The drawer and the app bar are named so a page transition can slide past
// them. Any view transition lifts those names out of the page, and for a
// frame the white canvas shows through. This one only grows the filter
// sheet, so those names come off until the snapshot is done.
function holdChromeNames() {
  for (const el of document.querySelectorAll("*")) {
    const name = getComputedStyle(el).viewTransitionName
    if (!name || name === "none" || name === SHEET) continue
    el.style.viewTransitionName = "none"
  }
}

function releaseChromeNames() {
  for (const el of document.querySelectorAll("*")) {
    if (el.style.viewTransitionName === "none") el.style.viewTransitionName = ""
  }
}
