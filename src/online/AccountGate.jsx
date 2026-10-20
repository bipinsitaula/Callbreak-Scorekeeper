import { useId, useState } from 'react'
import { FiEye, FiEyeOff, FiLoader, FiLock, FiLogIn, FiLogOut, FiUser, FiUserPlus, FiX } from 'react-icons/fi'
import Avatar from '../components/Avatar'
import BackHome from '../components/BackHome'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'
import { PASSWORD_MIN, USERNAME_MAX, USERNAME_MIN, usernameProblem } from './auth'
import { isSupabaseConfigured } from './supabase'
import { useOnlineStore } from './store'

/** Password input with an eye button that shows or hides what you typed. */
function PasswordField({ label, value, onChange, visible, onToggle, autoComplete, id }) {
  return (
    <div>
      <label htmlFor={id} className="label mb-2">
        {label}
      </label>
      <div className="relative">
        <FiLock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden="true" />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="field w-full !pl-10 !pr-12"
          value={value}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-mute transition-colors hover:bg-raised hover:text-ink"
        >
          {visible ? <FiEyeOff className="h-4 w-4" aria-hidden="true" /> : <FiEye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}

/** Sign in / create account pop-up: username and password, with show-password eyes. */
export function AuthDialog({ onClose }) {
  const signIn = useOnlineStore((s) => s.signIn)
  const signUp = useOnlineStore((s) => s.signUp)
  const busy = useOnlineStore((s) => s.busy)
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState(null)
  const ids = useId()
  const creating = mode === 'signup'

  const switchMode = (next) => {
    setMode(next)
    setError(null)
    setConfirm('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (creating) {
      const problem = usernameProblem(username)
      if (problem) return setError(problem)
      if (password.length < PASSWORD_MIN) return setError(`Passwords are at least ${PASSWORD_MIN} characters.`)
      if (password !== confirm) return setError('The two passwords don’t match.')
    }
    const result = await (creating ? signUp : signIn)(username, password)
    if (!result.ok) setError(result.error)
    // On success the account gate re-renders with the online screen, closing this pop-up.
  }

  return (
    <Modal onClose={onClose} labelledBy={`${ids}-title`} className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl sm:p-7">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 id={`${ids}-title`} className="text-2xl text-ink">
            {creating ? 'Create your account' : 'Sign in to play online'}
          </h2>
          <p className="mt-1 text-sm text-mute">
            {creating ? 'Pick a username the table will see, and a password to keep your seat and history.' : 'Your account keeps your seat and your game history on any device.'}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-mute hover:bg-raised hover:text-ink">
          <FiX className="h-5 w-5" />
        </button>
      </div>

      <div role="tablist" aria-label="Account" className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-raised/70 p-1">
        {[
          ['signin', 'Sign in', FiLogIn],
          ['signup', 'Create account', FiUserPlus],
        ].map(([m, label, Icon]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
              mode === m ? 'bg-accent text-accent-ink shadow-glow' : 'text-mute hover:text-ink'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      <form className="space-y-4" onSubmit={submit} noValidate>
        <div>
          <label htmlFor={`${ids}-user`} className="label mb-2">
            Username
          </label>
          <div className="relative">
            <FiUser className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden="true" />
            <input
              id={`${ids}-user`}
              className="field w-full !pl-10"
              value={username}
              maxLength={USERNAME_MAX}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={creating ? `${USERNAME_MIN}–${USERNAME_MAX} letters or numbers` : ''}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
            />
          </div>
        </div>
        <PasswordField
          id={`${ids}-pass`}
          label="Password"
          value={password}
          onChange={setPassword}
          visible={visible}
          onToggle={() => setVisible((v) => !v)}
          autoComplete={creating ? 'new-password' : 'current-password'}
        />
        {creating && (
          <PasswordField
            id={`${ids}-confirm`}
            label="Confirm password"
            value={confirm}
            onChange={setConfirm}
            visible={visible}
            onToggle={() => setVisible((v) => !v)}
            autoComplete="new-password"
          />
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary w-full" disabled={busy || !username || !password}>
          {busy ? <FiLoader className="h-4 w-4 animate-spin" aria-hidden="true" /> : creating ? <FiUserPlus className="h-4 w-4" aria-hidden="true" /> : <FiLogIn className="h-4 w-4" aria-hidden="true" />}
          {creating ? 'Create account' : 'Sign in'}
        </button>
        <p className="text-center text-sm text-mute">
          {creating ? 'Already have an account? ' : 'New here? '}
          <button type="button" className="font-bold text-accent hover:underline" onClick={() => switchMode(creating ? 'signin' : 'signup')}>
            {creating ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </form>
    </Modal>
  )
}

/** "Signed in as …" with a sign-out button (which asks first if you're at a table). */
export function AccountBar() {
  const me = useOnlineStore((s) => s.me)
  const code = useOnlineStore((s) => s.code)
  const signOut = useOnlineStore((s) => s.signOut)
  const [confirm, setConfirm] = useState(false)
  if (!me.id) return null
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface/80 px-4 py-2.5">
      <Avatar name={me.name} seat={0} size="sm" />
      <p className="min-w-0 flex-1 truncate text-sm text-mute">
        Signed in as <strong className="text-ink">{me.name}</strong>
      </p>
      <button type="button" className="btn btn-ghost !min-h-0 !px-3 !py-1.5" onClick={() => (code ? setConfirm(true) : signOut())}>
        <FiLogOut className="h-4 w-4" aria-hidden="true" /> Sign out
      </button>
      {confirm && (
        <ConfirmDialog
          title="Sign out?"
          message={`You'll leave table ${code}. Sign in as ${me.name} again to get your seat back.`}
          confirmLabel="Sign out"
          onConfirm={() => {
            setConfirm(false)
            signOut()
          }}
          onCancel={() => setConfirm(false)}
        />
      )}
    </div>
  )
}

/** Wraps every online screen: shows the sign-in pop-up until you're signed in. */
export default function AccountGate({ children }) {
  const authReady = useOnlineStore((s) => s.authReady)
  const me = useOnlineStore((s) => s.me)
  const [open, setOpen] = useState(true)

  if (!isSupabaseConfigured || me.id) return children
  if (!authReady) {
    return (
      <div className="panel flex items-center gap-3" role="status">
        <FiLoader className="h-5 w-5 animate-spin text-accent" aria-hidden="true" /> Checking your account…
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <BackHome />
      <section className="hero text-center">
        <FiUser className="mx-auto mb-3 h-10 w-10 text-accent" aria-hidden="true" />
        <h1 className="text-2xl text-ink sm:text-3xl">Sign in to play online</h1>
        <p className="mx-auto mt-2 max-w-md text-mute">Online games need an account, so your seat, your name and your game history follow you.</p>
        <button type="button" className="btn btn-primary mt-5" onClick={() => setOpen(true)}>
          <FiLogIn className="h-4 w-4" aria-hidden="true" /> Sign in or create an account
        </button>
      </section>
      {open && <AuthDialog onClose={() => setOpen(false)} />}
    </div>
  )
}
