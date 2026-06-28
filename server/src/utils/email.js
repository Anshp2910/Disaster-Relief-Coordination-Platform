import nodemailer from 'nodemailer'
import { logger } from './logger.js'

let transporter = null

function getTransporter() {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    logger.warn('SMTP not configured — emails will be logged to console only', {
      hint: 'Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in your .env file',
    })
    return null
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(port) || 587,
    secure: Number(port) === 465,
    auth: { user, pass },
  })

  return transporter
}

/**
 * Send an email. Falls back to console logging when SMTP is not configured.
 * @param {object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} [options.text] - Plain text fallback
 * @returns {Promise<boolean>} true if sent, false if console-only
 */
export async function sendEmail({ to, subject, html, text }) {
  const transport = getTransporter()

  if (!transport) {
    logger.info('email-console-fallback', {
      to,
      subject,
      text: text || html,
    })
    return false
  }

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
    })
    logger.info('email-sent', { to, subject })
    return true
  } catch (err) {
    logger.error('email-send-failed', { to, subject, message: err.message })
    return false
  }
}

/**
 * Send a password reset email.
 * @param {string} to - User's email address
 * @param {string} resetUrl - Full URL with reset token
 */
export async function sendPasswordResetEmail(to, resetUrl) {
  const appName = process.env.APP_NAME || 'Disaster Relief Platform'

  const html = `
    <div style="max-width:480px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;padding:32px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="font-size:20px;color:#1a1a2e;margin:0;">${appName}</h1>
      </div>
      <div style="background:#f8f9fa;border-radius:8px;padding:24px;">
        <h2 style="font-size:18px;color:#1a1a2e;margin:0 0 12px;">Reset your password</h2>
        <p style="font-size:14px;color:#4a5568;margin:0 0 20px;line-height:1.5;">
          You requested a password reset. Click the button below to set a new password. This link expires in 1 hour.
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:600;">
            Reset Password
          </a>
        </div>
        <p style="font-size:12px;color:#718096;margin:0;line-height:1.5;">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
      <p style="font-size:12px;color:#a0aec0;text-align:center;margin-top:24px;">
        ${appName} &mdash; Disaster Response Coordination
      </p>
    </div>
  `

  const text = [
    `Reset your password`,
    ``,
    `You requested a password reset. Visit the link below to set a new password.`,
    `This link expires in 1 hour.`,
    ``,
    resetUrl,
    ``,
    `If you didn't request a password reset, you can safely ignore this email.`,
  ].join('\n')

  return sendEmail({ to, subject: `Reset your password — ${appName}`, html, text })
}
