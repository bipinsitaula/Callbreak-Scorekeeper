import { useEffect, useState } from 'react'
import { FiCopy, FiLink, FiLoader, FiLock, FiPlay, FiShare2, FiUnlock, FiUsers } from 'react-icons/fi'
import { FaRobot } from 'react-icons/fa'
import { GiSpades } from 'react-icons/gi'
import BackHome from '../components/BackHome'
import Avatar from '../components/Avatar'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToastStore } from '../hooks/useToast'
import { getCardsPerPlayer } from '../utils/helpers'
import {
  DEFAULT_ROUNDS,
  MAX_NAME,
  MAX_SEATS,
  MIN_SEATS,
  ROUND_OPTIONS,
  addBot,
  removeBot,
  seatOf,
  setLocked,
  setTotalRounds,
  startGame,
} from './engine'
import { CODE_LENGTH, normalizeCode } from './room'
import { isSupabaseConfigured } from './supabase'
import ChatPanel, { ChatButton } from './ChatPanel'
import ConnectionBadge from './ConnectionBadge'
import LeaveButton from './LeaveButton'
import NoEntryDialog from './NoEntryDialog'
import SeatToggle from './SeatToggle'
import OnlineTable from './OnlineTable'
import { useOnlineStore } from './store'

/** Online Call Break: join screen, then the waiting room, then the table. */
export default function OnlineView() {
  const code = useOnlineStore((s) => s.code)
  const status = useOnlineStore((s) => s.row?.state.status)
  const refresh = useOnlineStore((s) => s.refresh)

  // Catch up when the tab comes back, and poll while the live connection is down.
  useEffect(() => {
    if (!code) return undefined
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    const id = setInterval(() => {
      if (useOnlineStore.getState().connection !== 'live') refresh()
    }, 8000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(id)
    }
  }, [code, refresh])

  if (!isSupabaseConfigured) return <SetupNotice />
  if (!code || !status) return <JoinScreen />
  return (
    <>
      {status === 'lobby' ? <WaitingRoom /> : <OnlineTable />}
      <ChatPanel />
    </>
  )
}

function SetupNotice() {
  return (
    <div className="space-y-6">
      <BackHome />
      <section className="panel space-y-3">
        <h1 className="text-2xl text-ink">Online play needs a Supabase project</h1>
        <p className="text-mute">
          Run <code className="rounded bg-raised px-1.5 text-ink">supabase/migrations/20261020000000_callbreak_rooms.sql</code> in your
          project’s SQL editor, then copy <code className="rounded bg-raised px-1.5 text-ink">.env.example</code> to{' '}
          <code className="rounded bg-raised px-1.5 text-ink">.env.local</code>, fill in your project URL and anon key, and restart the dev server.
        </p>
      </section>
    </div>
  )
}

function JoinScreen() {
  const me = useOnlineStore((s) => s.me)
  const busy = useOnlineStore((s) => s.busy)
  const savedCode = useOnlineStore((s) => s.savedCode)
  const inviteCode = useOnlineStore((s) => s.inviteCode)
  const create = useOnlineStore((s) => s.create)
  const join = useOnlineStore((s) => s.join)
  const forgetSavedRoom = useOnlineStore((s) => s.forgetSavedRoom)
  const resuming = useOnlineStore((s) => s.resuming)
  const resumeError = useOnlineStore((s) => s.resumeError)

  const [name, setName] = useState(me.name)
  const [code, setCode] = useState(inviteCode ?? '')
  const [rounds, setRounds] = useState(DEFAULT_ROUNDS)
  const [error, setError] = useState(null)
  const [turnedAway, setTurnedAway] = useState(null) // { code, message } when a room refuses entry

  const submit = async (request) => {
    setError(null)
    const result = await request()
    if (result.ok) return
    if (['locked', 'full', 'started'].includes(result.code)) setTurnedAway({ code: result.code, message: result.error })
    else setError(result.error)
  }

  const tryAnother = () => {
    setTurnedAway(null)
    setCode('')
    setTimeout(() => document.getElementById('online-code')?.focus(), 0)
  }

  return (
    <div className="space-y-6">
      <BackHome />

      <section className="hero">
        <div className="relative max-w-xl">
          <h1 className="flex items-center gap-3 text-3xl text-ink sm:text-4xl">
            <GiSpades className="h-10 w-10 flex-shrink-0 text-accent" aria-hidden="true" />
            Call Break online
          </h1>
          <p className="mt-3 text-base text-mute sm:text-lg">
            Play with friends, each on their own device. Make a table, share the room code, and the app shuffles, deals and keeps score.
          </p>
        </div>
      </section>

      {resuming && (
        <div className="panel flex items-center gap-3 !p-4 sm:!p-5" role="status">
          <FiLoader className="h-5 w-5 flex-shrink-0 animate-spin text-accent" aria-hidden="true" />
          <p className="text-ink">
            Getting your seat back at table <strong className="tracking-widest text-accent">{savedCode}</strong>…
          </p>
        </div>
      )}

      {savedCode && !inviteCode && !resuming && (
        <div className="panel flex flex-col gap-3 !p-4 sm:flex-row sm:items-center sm:justify-between sm:!p-5">
          <div>
            <p className="text-ink">
              You were at table <strong className="tracking-widest text-accent">{savedCode}</strong>.
            </p>
            {resumeError && <p className="mt-1 text-sm text-danger">{resumeError}</p>}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={forgetSavedRoom}>
              Forget
            </button>
            <button type="button" className="btn btn-primary" disabled={busy || !name.trim()} onClick={() => submit(() => join(name, savedCode))}>
              Rejoin
            </button>
          </div>
        </div>
      )}

      <section className="panel space-y-6">
        <div>
          <label htmlFor="online-name" className="label mb-2">
            Your name
          </label>
          <input
            id="online-name"
            className="field w-full"
            value={name}
            maxLength={MAX_NAME}
            autoComplete="nickname"
            placeholder="How the table will see you"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <form
            className="flex flex-col"
            onSubmit={(e) => {
              e.preventDefault()
              submit(() => create(name, rounds))
            }}
          >
            <h2 className="text-lg text-ink">Start a new table</h2>
            <p className="mb-4 mt-1 text-sm text-mute">You’ll get a room code to send to the other players.</p>
            <p className="label mb-2" id="create-rounds-label">
              Rounds to play
            </p>
            <div role="radiogroup" aria-labelledby="create-rounds-label" className="mb-4 grid grid-cols-5 gap-1.5">
              {ROUND_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={rounds === r}
                  onClick={() => setRounds(r)}
                  className="seg !min-h-[2.75rem] !px-1"
                >
                  {r}
                </button>
              ))}
            </div>
            <button type="submit" className="btn btn-primary mt-auto" disabled={busy || !name.trim()}>
              <FiUsers className="h-4 w-4" aria-hidden="true" /> Create room
            </button>
          </form>

          <form
            className="flex flex-col border-t border-line pt-6 md:border-l md:border-t-0 md:pl-6 md:pt-0"
            onSubmit={(e) => {
              e.preventDefault()
              submit(() => join(name, code))
            }}
          >
            <h2 className="text-lg text-ink">Join a table</h2>
            <label htmlFor="online-code" className="mb-2 mt-1 text-sm text-mute">
              Type the room code you were given.
            </label>
            <div className="mt-auto flex gap-2">
              <input
                id="online-code"
                className="field w-full min-w-0 text-center font-extrabold uppercase tracking-[0.3em]"
                value={code}
                placeholder={'•'.repeat(CODE_LENGTH)}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                onChange={(e) => setCode(normalizeCode(e.target.value))}
              />
              <button type="submit" className="btn btn-secondary flex-shrink-0" disabled={busy || !name.trim() || code.length < 4}>
                Join
              </button>
            </div>
          </form>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
            {error}
          </p>
        )}
      </section>

      <p className="px-1 text-center text-xs text-mute">
        {MIN_SEATS} to {MAX_SEATS} players; 4 is the classic game. Spades are trump. Lost your connection? Join again with the same code and name to get your seat back.
      </p>

      {turnedAway && (
        <NoEntryDialog code={turnedAway.code} message={turnedAway.message} onClose={() => setTurnedAway(null)} onTryAnother={tryAnother} />
      )}
    </div>
  )
}

function WaitingRoom() {
  const code = useOnlineStore((s) => s.code)
  const state = useOnlineStore((s) => s.row.state)
  const me = useOnlineStore((s) => s.me)
  const online = useOnlineStore((s) => s.online)
  const busy = useOnlineStore((s) => s.busy)
  const act = useOnlineStore((s) => s.act)
  const join = useOnlineStore((s) => s.join)
  const toast = useToastStore()

  const isHost = state.hostId === me.id
  const seated = seatOf(state, me.id) >= 0
  const host = state.players.find((p) => p.id === state.hostId)
  const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${code}`
  const canStart = state.players.length >= MIN_SEATS

  const [seatBusy, setSeatBusy] = useState(false)
  const [confirmLock, setConfirmLock] = useState(false)

  const run = async (action) => {
    const result = await act(action)
    if (!result.ok) toast.error(result.error)
    return result.ok
  }

  const setSeat = async (type, botId) => {
    setSeatBusy(true)
    await run(type === 'bot' ? (s, id) => addBot(s, id) : (s, id) => removeBot(s, id, botId))
    setSeatBusy(false)
  }

  const lockRoom = async () => {
    setConfirmLock(false)
    if (await run((s, id) => setLocked(s, id, true))) toast.success('Room closed to new players')
  }

  const unlockRoom = async () => {
    if (await run((s, id) => setLocked(s, id, false))) toast.success('Room open to new players')
  }

  const empty = MAX_SEATS - state.players.length

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${what} copied`)
    } catch {
      toast.error('Could not copy. Read the code out instead.')
    }
  }

  const share = () =>
    navigator.share({ title: 'Call Break', text: `Join my Call Break table. Room code: ${code}`, url: inviteUrl }).catch(() => {})

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LeaveButton />
        <div className="flex items-center gap-2">
          <ChatButton />
          <ConnectionBadge />
        </div>
      </div>

      <section className="hero text-center">
        <p className="label justify-center">Room code</p>
        <p className="mt-2 text-5xl font-extrabold tracking-[0.3em] text-accent sm:text-6xl" aria-label={`Room code ${code.split('').join(' ')}`}>
          {code}
        </p>
        {state.locked ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-danger/15 px-3 py-1 text-sm font-bold text-danger">
            <FiLock className="h-4 w-4" aria-hidden="true" /> Closed to new players
          </p>
        ) : (
          <p className="mt-3 text-mute">Others join by typing this code and their name.</p>
        )}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => copy(code, 'Room code')}>
            <FiCopy className="h-4 w-4" aria-hidden="true" /> Copy code
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => copy(inviteUrl, 'Invite link')}>
            <FiLink className="h-4 w-4" aria-hidden="true" /> Copy invite link
          </button>
          {typeof navigator.share === 'function' && (
            <button type="button" className="btn btn-secondary" onClick={share}>
              <FiShare2 className="h-4 w-4" aria-hidden="true" /> Share
            </button>
          )}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-[1fr_18rem]">
        <section className="panel" aria-labelledby="players-title">
          <h2 id="players-title" className="mb-4 text-lg text-ink">
            Players ({state.players.length}/{MAX_SEATS})
          </h2>
          <ul className="space-y-2">
            {state.players.map((p, seat) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl bg-raised/60 px-3 py-2.5">
                <span className="relative">
                  <Avatar name={p.name} seat={seat} />
                  {p.bot ? (
                    <span
                      title="Bot"
                      className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface bg-raised text-accent"
                    >
                      <FaRobot className="h-2.5 w-2.5" aria-hidden="true" />
                    </span>
                  ) : (
                    <span
                      title={online.includes(p.id) ? 'Online' : 'Away'}
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface ${
                        online.includes(p.id) ? 'bg-accent' : 'bg-faint'
                      }`}
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate font-bold text-ink">
                  {p.name}
                  {p.id === me.id && <span className="font-semibold text-mute"> (you)</span>}
                </span>
                {p.id === state.hostId && <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-bold text-accent">Host</span>}
                {p.bot &&
                  (isHost ? (
                    <SeatToggle value="bot" seatLabel={`Seat ${seat + 1}`} disabled={seatBusy} onChange={() => setSeat('player', p.id)} />
                  ) : (
                    <span className="rounded-full bg-raised px-2.5 py-0.5 text-xs font-bold text-mute">Bot</span>
                  ))}
              </li>
            ))}
            {Array.from({ length: empty }, (_, i) => {
              const seatNo = state.players.length + i + 1
              const optional = seatNo > 4
              return (
                <li
                  key={`empty-${i}`}
                  className={`flex items-center gap-3 rounded-xl border border-dashed border-line px-3 py-2.5 text-mute ${optional ? 'opacity-75' : ''}`}
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-dashed border-line" aria-hidden="true">
                    {state.locked && <FiLock className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{state.locked ? 'Closed to new players' : 'Waiting for a player…'}</span>
                    {optional && <span className="block text-xs text-faint">Optional 5th seat</span>}
                  </span>
                  {isHost && <SeatToggle value="player" seatLabel={`Seat ${seatNo}`} disabled={seatBusy} onChange={() => setSeat('bot')} />}
                </li>
              )
            })}
          </ul>
        </section>

        <section className="panel space-y-4" aria-labelledby="table-settings-title">
          <h2 id="table-settings-title" className="text-lg text-ink">
            Game
          </h2>
          <div>
            <p className="label mb-2" id="rounds-label">
              Rounds
            </p>
            <div role="radiogroup" aria-labelledby="rounds-label" className="grid grid-cols-5 gap-1.5">
              {ROUND_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={state.totalRounds === r}
                  disabled={!isHost}
                  onClick={() => run((s, id) => setTotalRounds(s, id, r))}
                  className="seg !min-h-[2.75rem] !px-1 disabled:cursor-default"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="label mb-2">Entry</p>
            {isHost ? (
              <button
                type="button"
                role="switch"
                aria-checked={state.locked}
                onClick={() => (state.locked ? unlockRoom() : setConfirmLock(true))}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  state.locked ? 'border-danger/50 bg-danger/10' : 'border-line bg-raised/60 hover:border-accent/60'
                }`}
              >
                {state.locked ? (
                  <FiLock className="h-5 w-5 flex-shrink-0 text-danger" aria-hidden="true" />
                ) : (
                  <FiUnlock className="h-5 w-5 flex-shrink-0 text-accent" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-ink">{state.locked ? 'Room closed' : 'Room open'}</span>
                  <span className="block text-xs text-mute">{state.locked ? 'Tap to let people join again' : 'Tap to stop new people joining'}</span>
                </span>
                <span aria-hidden="true" className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${state.locked ? 'bg-danger' : 'bg-line'}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${state.locked ? 'left-[1.375rem]' : 'left-0.5'}`} />
                </span>
              </button>
            ) : (
              <p className={`flex items-center gap-2 text-sm font-semibold ${state.locked ? 'text-danger' : 'text-mute'}`}>
                {state.locked ? <FiLock className="h-4 w-4" aria-hidden="true" /> : <FiUnlock className="h-4 w-4" aria-hidden="true" />}
                {state.locked ? 'Closed to new players' : 'Open to new players'}
              </p>
            )}
          </div>

          {!seated ? (
            <button type="button" className="btn btn-primary w-full" disabled={busy} onClick={() => join(me.name, code)}>
              Take a seat
            </button>
          ) : isHost ? (
            <>
              <button type="button" className="btn btn-primary w-full" disabled={!canStart} onClick={() => run((s, id) => startGame(s, id))}>
                <FiPlay className="h-4 w-4" aria-hidden="true" /> Start game
              </button>
              <p className="text-xs text-mute">
                {canStart
                  ? `${state.players.length} players, ${getCardsPerPlayer(state.players.length)} cards each.`
                  : `Waiting for at least ${MIN_SEATS} players.`}
              </p>
            </>
          ) : (
            <p className="text-sm text-mute">Waiting for {host?.name ?? 'the host'} to start the game.</p>
          )}
        </section>
      </div>

      {confirmLock && (
        <ConfirmDialog
          title="Close the room?"
          message="No one new will be able to join with the room code. Players already here stay, you can still fill seats with bots, and you can reopen the room any time before the game starts."
          confirmLabel="Close room"
          onConfirm={lockRoom}
          onCancel={() => setConfirmLock(false)}
        />
      )}
    </div>
  )
}
