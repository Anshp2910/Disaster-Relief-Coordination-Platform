import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as GitHubStrategy } from 'passport-github2'
import { User } from '../models/User.js'
import { logger } from '../utils/logger.js'

const SERVER_URL = process.env.SERVER_URL || process.env.CLIENT_URL || 'http://localhost:5001'

function serializeUser() {
  passport.serializeUser((user, done) => done(null, user._id))
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id)
      done(null, user)
    } catch (err) {
      done(err)
    }
  })
}

export function configurePassport() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
  const githubClientId = process.env.GITHUB_CLIENT_ID
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET

  if (googleClientId && googleClientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleClientId,
          clientSecret: googleClientSecret,
          callbackURL: `${SERVER_URL.replace(/\/+$/, '')}/api/auth/google/callback`,
          scope: ['profile', 'email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value || `${profile.id}@google-oauth.local`
            const displayName = profile.displayName || profile.name?.givenName || 'Google User'
            const avatar = profile.photos?.[0]?.value || ''
            const providerId = profile.id

            let user = await User.findOne({ provider: 'google', providerId })
            if (!user) {
              user = await User.findOne({ email })
              if (user) {
                user.provider = 'google'
                user.providerId = providerId
                user.avatar = avatar || user.avatar
                await user.save()
              }
            }
            if (!user) {
              user = await User.create({
                email,
                displayName,
                avatar,
                role: 'volunteer',
                provider: 'google',
                providerId,
              })
              logger.info('user-created-via-google', { email })
            }
            return done(null, user)
          } catch (err) {
            return done(err)
          }
        },
      ),
    )
  } else {
    logger.warn('Google OAuth not configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET')
  }

  if (githubClientId && githubClientSecret) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: githubClientId,
          clientSecret: githubClientSecret,
          callbackURL: `${SERVER_URL.replace(/\/+$/, '')}/api/auth/github/callback`,
          scope: ['user:email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value || profile.username ? `${profile.username}@github-oauth.local` : `${profile.id}@github-oauth.local`
            const displayName = profile.displayName || profile.username || 'GitHub User'
            const avatar = profile.photos?.[0]?.value || ''
            const providerId = profile.id

            let user = await User.findOne({ provider: 'github', providerId })
            if (!user) {
              user = await User.findOne({ email })
              if (user) {
                user.provider = 'github'
                user.providerId = providerId
                user.avatar = avatar || user.avatar
                await user.save()
              }
            }
            if (!user) {
              user = await User.create({
                email,
                displayName,
                avatar,
                role: 'volunteer',
                provider: 'github',
                providerId,
              })
              logger.info('user-created-via-github', { email })
            }
            return done(null, user)
          } catch (err) {
            return done(err)
          }
        },
      ),
    )
  } else {
    logger.warn('GitHub OAuth not configured — set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET')
  }

  serializeUser()
  return passport
}

// Register strategies immediately when this module is imported
configurePassport()
