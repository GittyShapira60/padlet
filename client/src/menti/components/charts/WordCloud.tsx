interface Props {
  words: Record<string, number>
  total: number
  dark?: boolean
}

const WORD_COLORS = [
  '#4f46e5', '#3b82f6', '#4338ca', '#6366f1',
  '#818cf8', '#60a5fa', '#a5b4fc', '#93c5fd',
]

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export default function WordCloud({ words, total, dark = false }: Props) {
  if (!total) return <p className="text-gray-500 text-sm text-center py-8">ממתין לתשובות...</p>

  const sorted = Object.entries(words).sort(([, a], [, b]) => b - a)
  const maxCount = sorted[0]?.[1] ?? 1

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border ${
        dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
      }`}
      style={{ minHeight: '280px' }}
    >
      {sorted.map(([word, count], i) => {
        const h = hashStr(word + i)
        // spread across 12–88% horizontally, 10–90% vertically
        const x = 12 + ((h & 0xFF) / 255) * 76
        const y = 10 + (((h >> 8) & 0xFF) / 255) * 80
        const rotation = ((h >> 16) % 31) - 15
        const fontSize = 0.75 + (count / maxCount) * 1.9
        const color = WORD_COLORS[(h >> 24) % WORD_COLORS.length]
        return (
          <span
            key={word}
            className="absolute font-bold select-none cursor-default transition-transform duration-300 hover:scale-110"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              fontSize: `${fontSize}rem`,
              color,
              whiteSpace: 'nowrap',
              lineHeight: 1,
            }}
            title={count > 1 ? `${word} (×${count})` : word}
          >
            {word}
          </span>
        )
      })}
    </div>
  )
}
