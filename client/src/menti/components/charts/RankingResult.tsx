interface RankedItem { item: string; score: number; rank: number }

interface Props {
  ranked: RankedItem[]
  total: number
  dark?: boolean
}

const RANK_COLORS = ['#4f46e5', '#3b82f6', '#4338ca', '#6366f1', '#818cf8']
const RANK_LABELS: string[] = []

export default function RankingResult({ ranked, total, dark = false }: Props) {
  if (!total || !ranked.length) {
    return <p className="text-gray-500 text-sm text-center py-8">ממתין לתשובות...</p>
  }

  const maxScore = ranked[0]?.score ?? 1

  return (
    <div className="space-y-3">
      {ranked.map((entry, i) => {
        const width = (entry.score / maxScore) * 100
        return (
          <div key={entry.item} className="flex items-center gap-3">
            <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ backgroundColor: RANK_COLORS[i % RANK_COLORS.length] }}>
              {i + 1}
            </span>
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className={`font-medium truncate ${dark ? 'text-white' : 'text-gray-800'}`}>
                  {entry.item}
                </span>
                <span className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {entry.score} נק'
                </span>
              </div>
              <div className={`h-5 rounded-full overflow-hidden ${dark ? 'bg-white/10' : 'bg-gray-100'}`}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${width}%`, backgroundColor: RANK_COLORS[i % RANK_COLORS.length] }}
                />
              </div>
            </div>
          </div>
        )
      })}
      <p className={`text-xs text-left pt-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
        {total} תשובות
      </p>
    </div>
  )
}
