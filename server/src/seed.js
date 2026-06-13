import { User } from './models/User.js'

export async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  const displayName = process.env.ADMIN_DISPLAY_NAME || 'Administrator'

  if (!email || !password) {
    console.log('[seed] ADMIN_EMAIL or ADMIN_PASSWORD not set, skipping admin seed')
    return
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase().trim() })

    if (existing) {
      if (existing.role !== 'admin') {
        existing.role = 'admin'
        await existing.save()
        console.log(`[seed] promoted existing user ${email} to admin`)
      } else {
        console.log(`[seed] admin user ${email} already exists`)
      }
      return
    }

    const user = new User({
      email: email.toLowerCase().trim(),
      role: 'admin',
      displayName,
      passwordHash: '',
    })
    user.setPassword(password)
    await user.save()
    console.log(`[seed] created admin user ${email}`)
  } catch (err) {
    console.error('[seed] failed to seed admin:', err.message)
  }
}
