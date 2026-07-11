import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ListChecks } from 'lucide-react'
import Badge from './Badge'
import useReducedMotion from '../hooks/useReducedMotion'
import { PRIORITY_COLORS } from '../utils/constants'

interface TaskItem {
  _id: string
  title?: string
  status?: string
  priority?: string
  createdAt?: string
}

interface TaskListProps {
  requests: TaskItem[]
  loading?: boolean
}

function timeSince(dateStr: string, tr: (key: string, opts?: Record<string, unknown>) => string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return tr('taskList.justNow')
  if (mins < 60) return tr('taskList.minutesAgo', { count: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return tr('taskList.hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  return tr('taskList.daysAgo', { count: days })
}

function TaskListInner({ requests, loading = false }: TaskListProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  const tasks = useMemo(() => {
    const highPriority = ['Critical', 'High']
    return requests
      .filter((r) => r.title && (r.status === 'Open' || r.status === 'Pending' || r.status === 'In Progress'))
      .sort((a, b) => {
        const pa = highPriority.indexOf(a.priority || '')
        const pb = highPriority.indexOf(b.priority || '')
        if (pa !== pb) return pa - pb
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      })
      .slice(0, 10)
  }, [requests])

  if (loading) {
    return (
      <>
        <div className="bento-header">
          <span className="bento-title"><ListChecks size={14} /> {t('taskList.title')}</span>
        </div>
        <div className="stack-xs">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="sk-card" style={{ padding: 'var(--space-xsml) var(--space-sm)' }}>
              <div className="sk-line" style={{ width: '70%', height: 14, marginBottom: 'var(--space-2xs)' }} />
              <div className="sk-line" style={{ width: '40%', height: 10 }} />
            </div>
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="bento-header">
        <span className="bento-title"><ListChecks size={14} /> {t('taskList.title')}</span>
        <span className="text-xs text-muted">{t('taskList.openCount', { count: tasks.length })}</span>
      </div>
      <div className="bento-card-scroll-content">
        {tasks.length === 0 ? (
          <div className="text-sm text-muted p-md text-center">{t('taskList.noOpenTasks')}</div>
        ) : (
          tasks.map((task) => (
            <motion.div
              key={task._id}
              className="list-card px-md py-sm cursor-pointer"
              whileHover={reduced ? {} : { scale: 1.01 }}
              onClick={() => navigate(`/requests/${task._id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/requests/${task._id}`) } }}
            >
              <div className="flex-between gap-sm">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-bold">{task.title}</div>
                  <div className="text-xs text-muted">
                    {task.createdAt ? timeSince(task.createdAt, t) : ''}
                    {task.status ? ` · ${t(`statuses.${task.status}`)}` : ''}
                  </div>
                </div>
                {task.priority && (
                  <Badge
                    label={task.priority}
                    colors={PRIORITY_COLORS}
                    colorKey={task.priority}
                  />
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </>
  )
}

const TaskList = memo(TaskListInner)
export default TaskList
