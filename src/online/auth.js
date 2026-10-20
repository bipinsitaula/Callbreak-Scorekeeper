/**
 * Username + password accounts on Supabase Auth.
 *
 * Supabase signs people in with an email address, so a username is stored as a placeholder
 * address (`name@players.example.com`). No mail is ever sent: turn OFF "Confirm email" in
 * Supabase (Authentication > Sign In / Providers > Email). Lower-casing the address makes
 * usernames unique regardless of case; the name as typed is kept in user_metadata.
 */
import { GameError } from './engine'
import { supabase } from './supabase'

export const USERNAME_MIN = 3
export const USERNAME_MAX = 16
export const PASSWORD_MIN = 6
const USERNAME = /^[A-Za-z0-9_.-]+$/
const DOMAIN = import.meta.env.VITE_USERNAME_EMAIL_DOMAIN || 'players.example.com'

const emailFor = (username) => `${username.toLowerCase()}@${DOMAIN}`

/** Error message for a username, or null when it's fine. */
export const usernameProblem = (raw) => {
  const username = String(raw ?? '').trim()
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return `Usernames are ${USERNAME_MIN} to ${USERNAME_MAX} characters.`
  }
  if (!USERNAME.test(username)) return 'Use letters, numbers, dots, dashes or underscores (no spaces).'
  return null
}

/** The player a session belongs to: { id, name }, or null when signed out. */
export const playerFrom = (session) =>
  session?.user
    ? { id: session.user.id, name: session.user.user_metadata?.username ?? session.user.email?.split('@')[0] ?? 'Player' }
    : null

const friendly = (error) => {
  const code = error?.code
  if (code === 'user_already_exists' || /already registered/i.test(error?.message)) return 'That username is taken. Pick another, or sign in.'
  if (code === 'invalid_credentials' || /invalid login/i.test(error?.message)) return 'Wrong username or password.'
  if (code === 'weak_password') return `Choose a stronger password (at least ${PASSWORD_MIN} characters).`
  if (code === 'email_not_confirmed') return 'This account is waiting for email confirmation. Turn off "Confirm email" in Supabase Auth settings.'
  if (code === 'email_address_invalid') return 'Supabase rejected the account address. Set VITE_USERNAME_EMAIL_DOMAIN to a domain you own.'
  if (code === 'signup_disabled') return 'New accounts are turned off in Supabase Auth settings.'
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') return 'Too many tries. Wait a minute and try again.'
  if (/fetch/i.test(error?.message)) return 'Could not reach the server. Check your connection.'
  return error?.message || 'Something went wrong. Try again.'
}

const check = (username, password) => {
  const problem = usernameProblem(username)
  if (problem) throw new GameError(problem)
  if (String(password ?? '').length < PASSWORD_MIN) throw new GameError(`Passwords are at least ${PASSWORD_MIN} characters.`)
}

export async function signUp(rawUsername, password) {
  const username = String(rawUsername ?? '').trim()
  check(username, password)
  const { data, error } = await supabase.auth.signUp({ email: emailFor(username), password, options: { data: { username } } })
  if (error) throw new GameError(friendly(error))
  if (!data.session) {
    // Supabase is waiting for an email nobody will receive.
    throw new GameError('Account created, but Supabase wants it confirmed by email. Turn off "Confirm email" in Supabase Auth settings, then sign in.')
  }
  return data.session
}

export async function signIn(rawUsername, password) {
  const username = String(rawUsername ?? '').trim()
  check(username, password)
  const { data, error } = await supabase.auth.signInWithPassword({ email: emailFor(username), password })
  if (error) throw new GameError(friendly(error))
  return data.session
}

export async function signOut() {
  await supabase.auth.signOut()
}
