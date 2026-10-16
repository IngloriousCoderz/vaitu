import { html, svg } from "@inglorious/web"

// Central icon registry (Lucide-style 24px stroke paths).
// Add new icons here; consumers use Icon.render({ name }) — never inline SVG.
const paths = {
  search: svg`<circle cx="11" cy="11" r="8" ></circle><path d="m21 21-4.3-4.3" ></path>`,
  sliders: svg`<line x1="21" x2="14" y1="4" y2="4" ></line><line x1="10" x2="3" y1="4" y2="4" ></line><line x1="21" x2="12" y1="12" y2="12" ></line><line x1="8" x2="3" y1="12" y2="12" ></line><line x1="21" x2="16" y1="20" y2="20" ></line><line x1="12" x2="3" y1="20" y2="20" ></line><line x1="14" x2="14" y1="2" y2="6" ></line><line x1="8" x2="8" y1="10" y2="14" ></line><line x1="16" x2="16" y1="18" y2="22" ></line>`,
  bag: svg`<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" ></path><path d="M3 6h18" ></path><path d="M16 10a4 4 0 0 1-8 0" ></path>`,
  compass: svg`<circle cx="12" cy="12" r="10" ></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" ></polygon>`,
  menu: svg`<line x1="4" x2="20" y1="6" y2="6" ></line><line x1="4" x2="20" y1="12" y2="12" ></line><line x1="4" x2="20" y1="18" y2="18" ></line>`,
  bell: svg`<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" ></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" ></path>`,
  "clipboard-list": svg`<rect width="8" height="4" x="8" y="2" rx="1" ry="1" ></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" ></path><path d="M12 11h4" ></path><path d="M12 16h4" ></path><path d="M8 11h.01" ></path><path d="M8 16h.01" ></path>`,
  ticket: svg`<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" ></path><path d="M13 5v2" ></path><path d="M13 17v2" ></path><path d="M13 11v2" ></path>`,
  user: svg`<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" ></path><circle cx="12" cy="7" r="4" ></circle>`,
  "arrow-left": svg`<path d="m12 19-7-7 7-7" ></path><path d="M19 12H5" ></path>`,
  plus: svg`<path d="M5 12h14" ></path><path d="M12 5v14" ></path>`,
  eye: svg`<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" ></path><circle cx="12" cy="12" r="3" ></circle>`,
  "eye-off": svg`<path d="M10.733 5.076a10.75 10.75 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-1.444 2.49" ></path><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" ></path><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" ></path><path d="m2 2 20 20" ></path>`,
  globe: svg`<circle cx="12" cy="12" r="10" ></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" ></path><path d="M2 12h20" ></path>`,
  instagram: svg`<rect width="20" height="20" x="2" y="2" rx="5" ry="5" ></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" ></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" ></line>`,
  "map-pin": svg`<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" ></path><circle cx="12" cy="10" r="3" ></circle>`,
  pencil: svg`<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" ></path>`,
  trash: svg`<path d="M3 6h18" ></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" ></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" ></path>`,
  check: svg`<path d="M20 6 9 17l-5-5" ></path>`,
  x: svg`<path d="M18 6 6 18" ></path><path d="m6 6 12 12" ></path>`,
  "chevron-down": svg`<path d="m6 9 6 6 6-6" ></path>`,
  "help-circle": svg`<circle cx="12" cy="12" r="10" ></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" ></path><path d="M12 17h.01" ></path>`,
  medal: svg`<path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15" ></path><path d="M11 12 5.12 2.2" ></path><path d="m13 12 5.88-9.8" ></path><path d="M8 7h8" ></path><circle cx="12" cy="17" r="5" ></circle><path d="M12 18v-2h-.5" ></path>`,
  star: svg`<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" ></path>`,
  trophy: svg`<path d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2" ></path><path d="M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2" ></path><path d="M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3" ></path><path d="M4 22h16" ></path><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" ></path><path d="M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3" ></path>`,
  settings: svg`<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" ></path><circle cx="12" cy="12" r="3" ></circle>`,
  mic: svg`<path d="M12 19v3" ></path><path d="M19 10v2a7 7 0 0 1-14 0v-2" ></path><rect x="9" y="2" width="6" height="13" rx="3" ></rect>`,
}

import { DEFAULT_ICON_SIZE } from "../../constants/index.js"

export const Icon = {
  render({ name, size = DEFAULT_ICON_SIZE }) {
    if (!paths[name]) console.warn(`Unknown icon: ${name}`)
    // Single <g> root: lit-html svg templates drop sibling roots,
    // which used to render only the first path of multi-path icons.
    return html`
      <svg
        width=${size}
        height=${size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <g>${paths[name] ?? ""}</g>
      </svg>
    `
  },
}
