import {
  defineConfig,
  minimal2023Preset as preset,
} from "@vite-pwa/assets-generator/config"

const background = "#f6f3ea"
const resizeOptions = { background, fit: "contain" }

export default defineConfig({
  headLinkOptions: { preset: "2023" },
  preset: {
    ...preset,
    transparent: { ...preset.transparent, padding: 0.25, resizeOptions },
    apple: { ...preset.apple, padding: 0.25, resizeOptions },
    maskable: { ...preset.maskable, padding: 0.33, resizeOptions },
  },
  images: ["public/logo.svg"],
})
