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
    transparent: { ...preset.transparent, padding: 0.25, resizeOptions }, // ≈ 0.75
    apple: { ...preset.apple, padding: 0.25, resizeOptions }, // ≈ 0.75
    maskable: { ...preset.maskable, padding: 0.33, resizeOptions }, // ≈ 0.67
  },
  images: ["public/logo.svg"],
})
