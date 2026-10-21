export const initials = (name) => (name ? name.trim().slice(0, 2).toUpperCase() : '')

// A stable colour per person, so someone keeps the same avatar hue everywhere.
export const personColor = (name) => {
  let hash = 0
  for (const ch of name.toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return `var(--person-${(hash % 6) + 1})`
}

export const sameName = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase()

export const displayName = (username) => (username ? username.charAt(0).toUpperCase() + username.slice(1) : '')
