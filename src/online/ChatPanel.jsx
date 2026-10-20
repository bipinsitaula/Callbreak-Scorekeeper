import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FiMessageCircle, FiSend, FiX } from 'react-icons/fi'
import Avatar from '../components/Avatar'
import { useToastStore } from '../hooks/useToast'
import { seatOf } from './engine'
import { MESSAGE_MAX } from './room'
import { useOnlineStore } from './store'

const QUICK = ['👍', '😂', '🔥', '😮', '😢', 'GG', 'Nice one!', 'Well played']

const time = (iso) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function UnreadBadge({ unread }) {
  if (!unread) return null
  return (
    <motion.span
      key={unread}
      initial={{ scale: 0.4 }}
      animate={{ scale: 1 }}
      className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-base bg-danger px-1 text-[11px] font-extrabold text-white"
    >
      {unread > 9 ? '9+' : unread}
    </motion.span>
  )
}

const chatLabel = (unread) => (unread ? `Open chat, ${unread} new message${unread > 1 ? 's' : ''}` : 'Open chat')

/** Chat button for the top bar on phones (a floating button would cover your cards there). */
export function ChatButton() {
  const open = useOnlineStore((s) => s.chatOpen)
  const setOpen = useOnlineStore((s) => s.setChatOpen)
  const unread = useOnlineStore((s) => s.unread)
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-label={chatLabel(unread)}
      className="btn btn-secondary relative !min-h-0 !px-3 !py-2 md:hidden"
    >
      <FiMessageCircle className="h-4 w-4" aria-hidden="true" />
      <UnreadBadge unread={unread} />
    </button>
  )
}

/** The chat panel (a bottom sheet on phones, a side card on wider screens), plus a floating button on wider screens. */
export default function ChatPanel() {
  const open = useOnlineStore((s) => s.chatOpen)
  const setOpen = useOnlineStore((s) => s.setChatOpen)
  const unread = useOnlineStore((s) => s.unread)

  // Rendered straight into <body>: inside the page's content layer it would sit under the
  // phone tab bar, which covered the message box.
  return createPortal(
    <>
      <AnimatePresence>{open && <Panel onClose={() => setOpen(false)} />}</AnimatePresence>
      {!open && (
        <motion.button
          type="button"
          onClick={() => setOpen(true)}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          aria-label={chatLabel(unread)}
          className="fixed bottom-6 right-6 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-ink shadow-glow md:flex"
        >
          <FiMessageCircle className="h-6 w-6" aria-hidden="true" />
          <UnreadBadge unread={unread} />
        </motion.button>
      )}
    </>,
    document.body
  )
}

/**
 * On phones the on-screen keyboard covers the bottom of the page without resizing it, which
 * would hide the message box. This keeps the bottom sheet inside the part of the screen that
 * is still visible (the visual viewport), sitting right on top of the keyboard.
 * Returns an inline style for the sheet, or undefined on wider screens.
 */
function useSheetAboveKeyboard() {
  const [style, setStyle] = useState()
  useEffect(() => {
    const vv = window.visualViewport
    const narrow = window.matchMedia('(max-width: 639px)')
    if (!vv) return undefined
    const update = () => {
      if (!narrow.matches) {
        setStyle(undefined)
        return
      }
      const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop) // keyboard height
      const keyboardUp = covered > 80
      setStyle({
        bottom: covered,
        // With the keyboard up, use almost all the space left; otherwise 70% of the screen.
        height: Math.round(keyboardUp ? vv.height - 8 : vv.height * 0.7),
      })
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    narrow.addEventListener('change', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      narrow.removeEventListener('change', update)
    }
  }, [])
  return style
}

function Panel({ onClose }) {
  const messages = useOnlineStore((s) => s.messages)
  const state = useOnlineStore((s) => s.row?.state)
  const me = useOnlineStore((s) => s.me)
  const code = useOnlineStore((s) => s.code)
  const send = useOnlineStore((s) => s.sendMessage)
  const toastError = useToastStore((s) => s.error)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const list = useRef(null)
  const input = useRef(null)
  const sheetStyle = useSheetAboveKeyboard()

  const seated = state ? seatOf(state, me.id) >= 0 : false
  const seatFor = (playerId) => Math.max(0, state ? seatOf(state, playerId) : 0)

  // Keep the newest message in view, also when the keyboard opens and the sheet shrinks.
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, sheetStyle?.height])

  useEffect(() => {
    // Phones would pop the keyboard over the table; only focus where there's a real keyboard.
    if (window.matchMedia('(pointer: fine)').matches) input.current?.focus()
  }, [])

  const submit = async (body) => {
    if (sending || !body.trim()) return
    setSending(true)
    const result = await send(body)
    setSending(false)
    if (result.ok) {
      if (body === text) setText('')
    } else toastError(result.error)
  }

  return (
    <motion.section
      role="dialog"
      aria-label="Table chat"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      style={sheetStyle}
      className="fixed inset-x-0 bottom-0 z-[55] flex h-[70dvh] flex-col rounded-t-3xl border border-line bg-surface shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[34rem] sm:w-96 sm:rounded-3xl"
    >
      <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div>
          <h2 className="flex items-center gap-2 text-lg text-ink">
            <FiMessageCircle className="h-5 w-5 text-accent" aria-hidden="true" />
            Table chat
          </h2>
          <p className="text-xs text-mute">Room {code}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close chat" className="rounded-lg p-2 text-mute hover:bg-raised hover:text-ink">
          <FiX className="h-5 w-5" />
        </button>
      </header>

      <ol ref={list} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.length === 0 && (
          <li className="flex h-full flex-col items-center justify-center text-center text-sm text-mute">
            <FiMessageCircle className="mb-2 h-8 w-8 text-faint" aria-hidden="true" />
            No messages yet. Say hello to the table!
          </li>
        )}
        {messages.map((m, i) => {
          const mine = m.player_id === me.id
          const grouped = i > 0 && messages[i - 1].player_id === m.player_id
          return (
            <motion.li
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''} ${grouped ? '!mt-1' : ''}`}
            >
              {!mine && (
                <span className={grouped ? 'invisible' : ''}>
                  <Avatar name={m.name} seat={seatFor(m.player_id)} size="sm" />
                </span>
              )}
              <div className={`max-w-[75%] ${mine ? 'text-right' : ''}`}>
                {!grouped && !mine && <p className="mb-0.5 px-1 text-xs font-bold text-mute">{m.name}</p>}
                <p
                  className={`inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-sm ${
                    mine ? 'rounded-br-md bg-accent text-accent-ink' : 'rounded-bl-md bg-raised text-ink'
                  } ${/^\p{Extended_Pictographic}+$/u.test(m.body) ? '!bg-transparent px-1 text-3xl' : ''}`}
                >
                  {m.body}
                </p>
                <p className="mt-0.5 px-1 text-[10px] text-faint">{time(m.created_at)}</p>
              </div>
            </motion.li>
          )
        })}
      </ol>

      {seated ? (
        <div className="border-t border-line px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5">
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Quick messages">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                disabled={sending}
                onClick={() => submit(q)}
                className="flex-shrink-0 rounded-full border border-line bg-raised px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-accent/60 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              submit(text)
            }}
          >
            <label htmlFor="chat-input" className="sr-only">
              Message
            </label>
            <input
              id="chat-input"
              ref={input}
              className="field min-w-0 flex-1 !py-2.5"
              value={text}
              maxLength={MESSAGE_MAX}
              placeholder="Message the table…"
              autoComplete="off"
              enterKeyHint="send"
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" aria-label="Send message" disabled={sending || !text.trim()} className="btn btn-primary !min-h-[2.75rem] !px-3.5">
              <FiSend className="h-5 w-5" aria-hidden="true" />
            </button>
          </form>
          {text.length > MESSAGE_MAX - 40 && (
            <p className="mt-1 text-right text-[11px] text-mute">
              {text.length}/{MESSAGE_MAX}
            </p>
          )}
        </div>
      ) : (
        <p className="border-t border-line px-4 py-3 text-center text-sm text-mute">Take a seat to join the chat.</p>
      )}
    </motion.section>
  )
}
