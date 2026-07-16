interface Props {
  min: number
  max: number
  minLabel: string
  maxLabel: string
  average: number
  distribution: Record<number, number>
  total: number
  dark?: boolean
}

export default function ScaleResult({ min, max, minLabel, maxLabel, average, distribution, total, dark = false }: Props) {
  if (!total) return <p className="text-gray-500 text-sm text-center py-8">ממתין לתשובות...</p>

  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  const maxCount = Math.max(...steps.map((v) => distribution[v] ?? 0), 1)

  return (
    <div>
      <div className="text-center mb-6">
        <span className="text-5xl font-bold text-indigo-500">{average}</span>
        <p className={`text-sm mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
          ממוצע מתוך {max} · {total} תשובות
        </p>
      </div>

      <div className="flex items-end justify-center gap-2">
        {steps.map((v) => {
          const count = distribution[v] ?? 0
          const height = (count / maxCount) * 80

          return (
            <div key={v} className="flex flex-col items-center gap-1">
              <span className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                {count || ''}
              </span>
              <div
                className="w-8 rounded-t-lg transition-all duration-700"
                style={{
                  height: `${Math.max(height, 4)}px`,
                  backgroundColor: `hsl(${234 + (v / max) * 10}, 72%, 58%)`,
                }}
              />
              <span className={`text-xs ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{v}</span>
            </div>
          )
        })}
      </div>

      <div className={`flex justify-between text-xs mt-2 px-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}
