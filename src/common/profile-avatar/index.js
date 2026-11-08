import { Avatar } from "@inglorious/ui/avatar"

import { FIRST_INDEX, LAST_INDEX_OFFSET } from "../../constants/index.js"

const ONE_WORD = 1

export const ProfileAvatar = {
  /** @param {{ name?: string | null, src?: string | null, size?: import("@inglorious/ui/avatar").AvatarProps["size"], alt?: string | null }} props */
  render({ name, src, size = "md", alt = name }) {
    return Avatar.render({
      src: src || "",
      alt: alt ?? "",
      initials: initials(name),
      size,
      backgroundColor: "linear-gradient(135deg, #6b7a5e, #24402f)",
      textColor: "#fffdf7",
    })
  },
}

export function initials(name) {
  const words = (name ?? "").split(" ").filter(Boolean)
  if (words.length <= ONE_WORD)
    return (words.at(FIRST_INDEX)?.at(FIRST_INDEX) ?? "?").toUpperCase()
  return `${words.at(FIRST_INDEX)?.at(FIRST_INDEX)}${words.at(words.length - LAST_INDEX_OFFSET)?.at(FIRST_INDEX)}`.toUpperCase()
}
