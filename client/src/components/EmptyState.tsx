interface EmptyStateAction {
  onClick: () => void
  label: string
}

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: EmptyStateAction
}

export default function EmptyState({ icon = '\u{1F4CB}', title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="btnPrimary">
          {action.label}
        </button>
      )}
    </div>
  )
}
