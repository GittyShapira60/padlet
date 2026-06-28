interface Props {
  texts: string[]
  total: number
  dark?: boolean
}

export default function OpenTextResult({ texts, total, dark = false }: Props) {
  if (!total) return <p className="text-gray-500 text-sm text-center py-8">ממתין לתשובות...</p>

  return (
    <div>
      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
        {[...texts].reverse().map((text, i) => (
          <div
            key={i}
            className={`rounded-xl px-4 py-2.5 text-sm ${
              dark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-800'
            }`}
          >
            {text}
          </div>
        ))}
      </div>
      <p className={`text-xs text-left mt-3 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
        {total} תשובות
      </p>
    </div>
  )
}
