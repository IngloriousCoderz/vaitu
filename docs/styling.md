# Styling

Styles load in this order, and later rules win at equal specificity:

1. `public/style.css`, linked from `index.html`. It loads before the package,
   so its overrides double a class (`span.iw-chip.iw-chip`) to win on
   specificity rather than on order.
2. `@inglorious/ui/all.css`, imported once at the top of `src/main.js`: the
   package's reset, tokens and every component's styles.
3. `src/styles/*.css`: the Vaitu theme (`.iw-theme-vaitu` on `<body>`) and the
   per-category skins.
4. Each view's `style.module.css`, imported by the view that uses it.

To customize a component, override its `--iw-*` tokens in
`src/styles/theme.css`, or add a rule in a module. Nothing needs importing when
a new package component comes into use.

## Why `all.css`

The app used to import each component's stylesheet by hand, 26 lines in
`main.js`. That had three problems:

- A component whose CSS was never added rendered unstyled. Typography was
  missing, so the not-found page showed browser-default headings.
- The cascade followed the order of our imports, not the package's. `flex.css`
  came after `drawer.css`, so the drawer body could not scroll.
- `combobox.css` pulls in `chip.css`, which was also imported directly, so the
  chip styles shipped twice. A single entry lets Vite inline each file once.

`all.css` costs about 4 KB more gzipped (21.5 KB of CSS against 17.2 KB). Vite
does not drop unused CSS, and PurgeCSS would need the package's runtime class
names (`iw-flex-justify-${justify}`) safelisted, which takes back most of the
saving.

The switch was checked in a browser against the previous build, on every
route, signed out and as both seed users, at phone and desktop widths. Only the
three fixes above changed anything on screen. Rules made redundant by the
package's reset (`box-sizing`, `body` margin), duplicates of package or theme
values, and rules whose selectors no longer match anything were then removed,
with no change to any computed style.

Next: [Edge functions](edge-functions.md).
