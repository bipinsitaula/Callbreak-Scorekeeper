/** Empty screen that points to the next action. */
export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="panel flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-raised text-accent">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="mb-1 text-xl text-ink">{title}</h2>
      <p className="mb-6 max-w-sm text-mute">{message}</p>
      {action}
    </div>
  )
}
