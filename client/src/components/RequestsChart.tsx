import { motion } from 'framer-motion'
import { BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface RequestsChartProps {
  data: Array<{ date: string; count: number }>
}

export default function RequestsChart({ data }: RequestsChartProps) {
  return (
    <>
      <div className="bento-header">
        <span className="bento-title"><BarChart3 size={14} /> Requests Over Time</span>
      </div>
      {data.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--gov-muted)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--gov-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }} />
              <Bar dataKey="count" fill="var(--accent)" fillOpacity={0.6} radius={[2, 2, 0, 0]} animationBegin={200} animationDuration={800} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      ) : (
        <div className="text-sm text-muted p-lg text-center">No request data available</div>
      )}
    </>
  )
}
