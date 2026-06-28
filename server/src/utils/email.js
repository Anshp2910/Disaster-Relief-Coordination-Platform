import { Resend } from 'resend'
import { logger } from './logger.js'

let resendClient = null

function getClient() {
  if (resendClient) return resendClient

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      logger.warn('Resend not configured — set RESEND_API_KEY in your .env file', {
        hint: 'Get an API key at https://resend.com/api-keys',
      })
    } else {
      logger.info('Resend not configured — emails will be logged to console only', {
        hint: 'Set RESEND_API_KEY in your .env to send real emails',
      })
    }
    return null
  }

  resendClient = new Resend(apiKey)
  return resendClient
}

/**
 * Send an email via Resend. Falls back to console logging when RESEND_API_KEY is not set.
 * @param {object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} [options.text] - Plain text fallback
 * @returns {Promise<boolean>} true if sent, false if console-only or failed
 */
export async function sendEmail({ to, subject, html, text }) {
  const client = getClient()

  if (!client) {
    logger.info('email-console-fallback', {
      to,
      subject,
      text: text || html,
    })
    return false
  }

  try {
    const sendAttempt = async (from) => {
      return client.emails.send({
        from,
        to: [to],
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, ''),
      })
    }

    const preferredFrom = process.env.RESEND_FROM || process.env.RESEND_EMAIL || ''
    const defaultFrom = 'noreply@resend.dev'

    let result = await sendAttempt(preferredFrom || defaultFrom)

    if (result.error && preferredFrom) {
      logger.warn('email-send-failed-with-custom-from', {
        to,
        subject,
        from: preferredFrom,
        message: result.error.message,
        hint: 'Your custom sender domain may not be verified in Resend. Retrying with default sender.',
      })
      result = await sendAttempt(defaultFrom)
    }

    if (result.error) {
      logger.error('email-send-failed', { to, subject, message: result.error.message })
      return false
    }

    logger.info('email-sent', { to, subject, id: result.data?.id })
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
