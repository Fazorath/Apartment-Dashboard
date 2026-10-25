const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch])

// A link to a frontend page, for emails
export const frontendLink = (path) => `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')}${path}`
