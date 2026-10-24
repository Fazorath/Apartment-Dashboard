import nodemailer from 'nodemailer'

/**
 * Mailer with one interface, `send({ to, subject, text, html })`, and three transports:
 * - memory: tests read sent messages from `outbox`
 * - smtp: production, configured through the SMTP_* env vars
 * - console: development, logs each message so flows work without an SMTP account
 */

export const outbox = []

export const clearOutbox = () => {
  outbox.length = 0
}

let smtpTransport

const pickTransport = () => {
  if (process.env.NODE_ENV === 'test') return 'memory'
  if (process.env.SMTP_HOST) return 'smtp'
  return 'console'
}

const getSmtpTransport = () => {
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
    })
  }
  return smtpTransport
}

export const send = async ({ to, subject, text, html }) => {
  const message = { from: process.env.MAIL_FROM || 'Roommate Dash <no-reply@localhost>', to, subject, text, html }

  switch (pickTransport()) {
    case 'memory':
      outbox.push(message)
      return
    case 'smtp':
      await getSmtpTransport().sendMail(message)
      return
    default:
      console.log(`📧 Email to ${to}\n   Subject: ${subject}\n\n${text}\n`)
  }
}

export default { send }
