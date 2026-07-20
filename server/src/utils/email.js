import { Resend } from 'resend'
import nodemailer from 'nodemailer'
import { logger } from './logger.js'

let resendClient = null
let nodemailerTransport = null

function getClient() {
  if (resendClient) return resendClient

  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    resendClient = new Resend(apiKey)
    return resendClient
  }

  logger.info('Resend API key not set, emails will be logged to console only')
  logger.info('To send real emails, either set RESEND_API_KEY or configure SMTP_HOST, SMTP_USER, SMTP_PASS in .env')
  return null
}

function getNodemailerTransport() {
  if (nodemailerTransport) return nodemailerTransport

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null

  try {
    nodemailerTransport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
    return nodemailerTransport
  } catch (err) {
    logger.warn('nodemailer-transport-setup-failed', { message: err.message })
    return null
  }
}

/**
 * Send an email. Tries Resend API first, falls back to SMTP (nodemailer), then console.
 * @param {object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.html
 * @param {string} [options.text]
 * @param {string} [options.from] - override sender email
 * @returns {Promise<boolean>} true if sent, false if logged to console only
 */
export async function sendEmail({ to, subject, html, text, from }) {
  const resendClient = getClient()

  if (resendClient) {
    try {
      const preferredFrom = from || process.env.RESEND_FROM || process.env.RESEND_EMAIL || ''
      const defaultFrom = 'noreply@resend.dev'
      const sender = preferredFrom || defaultFrom

      const result = await resendClient.emails.send({
        from: sender,
        to: [to],
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, ''),
      })

      if (result.error) {
        logger.warn('resend-send-failed-retrying-default', { to, subject, message: result.error.message })
        if (preferredFrom && sender !== defaultFrom) {
          const retry = await resendClient.emails.send({
            from: defaultFrom,
            to: [to],
            subject,
            html,
            text: text || html.replace(/<[^>]+>/g, ''),
          })
          if (retry.error) {
            logger.error('resend-send-failed', { to, subject, message: retry.error.message })
            return false
          }
        } else {
          logger.error('resend-send-failed', { to, subject, message: result.error.message })
          return false
        }
      }

      logger.info('email-sent-via-resend', { to, subject, id: result.data?.id })
      return true
    } catch (err) {
      logger.error('resend-send-error', { to, subject, message: err.message })
    }
  }

  const smtpTransport = getNodemailerTransport()
  if (smtpTransport) {
    try {
      const defaultFrom = process.env.SMTP_FROM || process.env.RESEND_EMAIL || process.env.RESEND_FROM || 'noreply@resend.dev'
      const sender = from || defaultFrom
      const info = await smtpTransport.sendMail({
        from: sender,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, ''),
      })
      logger.info('email-sent-via-smtp', { to, subject, messageId: info.messageId })
      return true
    } catch (err) {
      logger.error('smtp-send-error', { to, subject, message: err.message })
    }
  }

  logger.info('email-console-fallback', { to, subject, text: text || html })
  return false
}

/**
 * Send a password reset email.
 * @param {string} to
 * @param {string} resetUrl
 */
export async function sendPasswordResetEmail(to, resetUrl) {
  const appName = process.env.APP_NAME || 'Disaster Relief Platform'
  const logoUrl = process.env.EMAIL_LOGO_URL || ''
  const accent = '#2563eb'

  const html = `
<div style="max-width:480px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;padding:32px;">
  ${logoUrl ? `<div style="text-align:center;margin-bottom:20px;"><img src="${logoUrl}" alt="${appName}" style="height:40px;" /></div>` : ''}
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="font-size:20px;color:#1a1a2e;margin:0;">${appName}</h1>
  </div>
  <div style="background:#f8f9fa;border-radius:12px;padding:28px;border:1px solid #e9ecef;">
    <h2 style="font-size:18px;color:#1a1a2e;margin:0 0 12px;">Reset your password</h2>
    <p style="font-size:14px;color:#4a5568;margin:0 0 20px;line-height:1.6;">
      Click the button below to set a new password for your account.
      This link is valid for <strong>1 hour</strong>.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${resetUrl}"
         style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;padding:12px 36px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.01em;">
        Reset Password
      </a>
    </div>
    <p style="font-size:13px;color:#718096;margin:0 0 8px;line-height:1.5;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="font-size:12px;color:#4a5568;word-break:break-all;background:#ffffff;padding:8px 12px;border-radius:6px;border:1px solid #e9ecef;margin:0 0 16px;">
      ${resetUrl}
    </p>
    <p style="font-size:12px;color:#718096;margin:0;line-height:1.5;">
      If you didn't request a password reset, you can safely ignore this email.
    </p>
  </div>
  <p style="font-size:11px;color:#a0aec0;text-align:center;margin-top:24px;">
    ${appName} &mdash; Disaster Response Coordination
  </p>
</div>
  `

  const text = [
    `Reset your password — ${appName}`,
    ``,
    `You requested a password reset. Visit the link below to set a new password.`,
    `This link expires in 1 hour.`,
    ``,
    resetUrl,
    ``,
    `If you didn't request a password reset, you can safely ignore this email.`,
  ].join('\n')

  return sendEmail({
    to,
    subject: `Reset your password — ${appName}`,
    html,
    text,
  })
}
