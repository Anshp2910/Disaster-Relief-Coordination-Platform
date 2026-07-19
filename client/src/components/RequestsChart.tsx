import { memo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import useReducedMotion from '../hooks/useReducedMotion'

interface RequestsChartProps {
  data: Array<{ date: string; count: number }>
}

const RequestsChart = memo(function RequestsChart({ data }: RequestsChartProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  return (
    <>
      <div className="bento-header">
        <span className="bento-title"><BarChart3 size={14} /> {t('requestsChart.title')}</span>
      </div>
      {data.length > 0 ? (
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--gov-muted)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--gov-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--accent)" fillOpacity={0.6} radius={[2, 2, 0, 0]} animationBegin={reduced ? 0 : 200} animationDuration={reduced ? 0 : 800} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      ) : (
        <div className="text-sm text-muted p-lg text-center">{t('requestsChart.noData')}</div>
      )}
    </>
  )
})

export default RequestsChart
