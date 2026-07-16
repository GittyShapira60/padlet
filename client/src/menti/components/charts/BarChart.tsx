interface Props {
  options: string[]
  tally: Record<string, number>
  total: number
  dark?: boolean
}

const COLORS = [
  '#4f46e5', '#3b82f6', '#4338ca', '#6366f1',
  '#818cf8', '#60a5fa', '#a5b4fc', '#93c5fd',
]

export default function BarChart({ options, tally, total, dark = false }: Props) {
  const max = Math.max(...options.map((o) => tally[o] ?? 0), 1)

  return (
    <div className="space-y-3">
      {options.map((option, i) => {
        const count = tally[option] ?? 0
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        const width = (count / max) * 100

        return (
          <div key={option}>
            <div className="flex items-center justify-between mb-1 text-sm">
              <span className={`font-medium truncate max-w-[70%] ${dark ? 'text-white' : 'text-gray-800'}`}>
                {option}
              </span>
              <span className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                {count} ({pct}%)
              </span>
            </div>
            <div className={`h-8 rounded-lg overflow-hidden ${dark ? 'bg-white/10' : 'bg-gray-100'}`}>
              <div
                className="h-full rounded-lg transition-all duration-700 ease-out"
                style={{ width: `${width}%`, backgroundColor: COLORS[i % COLORS.length] }}
              />
            </div>
          </div>
        )
      })}
      {total > 0 && (
        <p className={`text-xs text-left pt-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          {total} תשובות
        </p>
      )}
    </div>
  )
}
