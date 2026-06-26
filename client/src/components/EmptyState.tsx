import { RippleBtn } from '../components/ui'

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
        <RippleBtn onClick={action.onClick} className="">
          {action.label}
        </RippleBtn>
      )}
    </div>
  )
}
