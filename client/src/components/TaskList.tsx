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

function timeSince(dateStr: string, t: (key: string, opts?: object) => string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t('taskList.justNow')
  if (mins < 60) return t('taskList.minutesAgo', { count: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t('taskList.hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  return t('taskList.daysAgo', { count: days })
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
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
    <motion.div className="bento-card mb-md" variants={reduced ? {} : cardVariants}>
      <div className="bento-header">
        <span className="bento-title"><ListChecks size={14} /> {t('taskList.title')}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="sk-card" style={{ padding: '12px 16px' }}>
              <div className="sk-line" style={{ width: '70%', height: 14, marginBottom: 6 }} />
              <div className="sk-line" style={{ width: '40%', height: 10 }} />
            </div>
          ))}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div className="bento-card mb-md" variants={cardVariants}>
      <div className="bento-header">
        <span className="bento-title"><ListChecks size={14} /> {t('taskList.title')}</span>
        <span className="text-xs text-muted">{t('taskList.openCount', { count: tasks.length })}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.length === 0 ? (
          <div className="text-sm text-muted p-md text-center">{t('taskList.noOpenTasks')}</div>
        ) : (
          tasks.map((task) => (
            <motion.div
              key={task._id}
              className="listCard px-md py-sm cursor-pointer"
              whileHover={reduced ? {} : { scale: 1.01 }}
              onClick={() => navigate(`/requests/${task._id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/requests/${task._id}`) } }}
            >
              <div className="flex-between gap-sm">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-bold">{task.title}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {task.createdAt ? timeSince(task.createdAt, t) : ''}
                    {task.status ? ` · ${t(`statuses.${task.status}`)}` : ''}
                  </div>
                </div>
                {task.priority && (
                  <Badge
                    label={task.priority}
                    colors={PRIORITY_COLORS as unknown as Record<string, { bg: string; border: string; text: string }>}
                    colorKey={task.priority}
                  />
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  )
}

const TaskList = memo(TaskListInner)
export default TaskList
