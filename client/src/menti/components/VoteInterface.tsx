import { useState } from 'react'
import type { MentiSlide, SlideAnswer } from '../types'
import type { MultipleChoiceConfig, RankingConfig, ScaleConfig } from '../types'

interface Props {
  slide: MentiSlide
  onSubmit: (answer: SlideAnswer) => void
  disabled: boolean
}

export default function VoteInterface({ slide, onSubmit, disabled }: Props) {
  switch (slide.type) {
    case 'multiple_choice': return <MultipleChoiceVote slide={slide} onSubmit={onSubmit} disabled={disabled} />
    case 'word_cloud': return <WordCloudVote onSubmit={onSubmit} disabled={disabled} />
    case 'open_text': return <OpenTextVote onSubmit={onSubmit} disabled={disabled} />
    case 'scale': return <ScaleVote slide={slide} onSubmit={onSubmit} disabled={disabled} />
    case 'ranking': return <RankingVote slide={slide} onSubmit={onSubmit} disabled={disabled} />
    case 'qa': return <QAVote onSubmit={onSubmit} disabled={disabled} />
    default: return null
  }
}

// ─── Multiple Choice ──────────────────────────────────────────────────────────

function MultipleChoiceVote({ slide, onSubmit, disabled }: Props) {
  const cfg = slide.config as unknown as MultipleChoiceConfig
  const [selected, setSelected] = useState<string[]>([])

  const toggle = (opt: string) => {
    if (cfg.allowMultiple) {
      setSelected((prev) =>
        prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt],
      )
    } else {
      setSelected([opt])
    }
  }

  return (
    <div className="space-y-2">
      {(cfg.options ?? []).map((opt) => (
        <button
          key={opt}
          onClick={() => toggle(opt)}
          className={`w-full text-right py-3 px-4 rounded-xl border-2 font-medium text-sm transition-all ${
            selected.includes(opt)
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300'
          }`}
        >
          {opt}
        </button>
      ))}
      <button
        onClick={() => onSubmit({ selected })}
        disabled={disabled || selected.length === 0}
        className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        שלח תשובה
      </button>
    </div>
  )
}

// ─── Word Cloud ───────────────────────────────────────────────────────────────

function WordCloudVote({ onSubmit, disabled }: Omit<Props, 'slide'>) {
  const [input, setInput] = useState('')

  const handleSubmit = () => {
    const words = input
      .split(/[\s,،]+/)
      .map((w) => w.trim())
      .filter(Boolean)
      .slice(0, 3)
    if (words.length === 0) return
    onSubmit({ words })
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="כתוב עד 3 מילים, מופרדות בפסיק"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        className="w-full border-2 border-gray-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm focus:outline-none"
        dir="rtl"
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !input.trim()}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        שלח תשובה
      </button>
    </div>
  )
}

// ─── Open Text ────────────────────────────────────────────────────────────────

function OpenTextVote({ onSubmit, disabled }: Omit<Props, 'slide'>) {
  const [text, setText] = useState('')

  return (
    <div className="space-y-3">
      <textarea
        placeholder="כתוב את תשובתך כאן..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full border-2 border-gray-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm focus:outline-none resize-none"
        dir="rtl"
      />
      <button
        onClick={() => onSubmit({ text })}
        disabled={disabled || !text.trim()}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        שלח תשובה
      </button>
    </div>
  )
}

// ─── Scale ────────────────────────────────────────────────────────────────────

function ScaleVote({ slide, onSubmit, disabled }: Props) {
  const cfg = slide.config as unknown as ScaleConfig
  const min = cfg.min ?? 1
  const max = cfg.max ?? 10
  const mid = Math.round((min + max) / 2)
  const [value, setValue] = useState<number>(mid)
  const [touched, setTouched] = useState(false)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="text-6xl font-bold text-indigo-600 tabular-nums">{value}</span>
      </div>
      <div className="px-1">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => { setValue(Number(e.target.value)); setTouched(true) }}
          className="w-full accent-indigo-600 h-2 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-2 px-0.5">
          <span>{cfg.minLabel || min}</span>
          <span>{cfg.maxLabel || max}</span>
        </div>
      </div>
      <button
        onClick={() => onSubmit({ value })}
        disabled={disabled || !touched}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        שלח תשובה
      </button>
    </div>
  )
}

// ─── Ranking ──────────────────────────────────────────────────────────────────

function RankingVote({ slide, onSubmit, disabled }: Props) {
  const cfg = slide.config as unknown as RankingConfig
  const items = cfg.items ?? []
  const [order, setOrder] = useState<string[]>([])
  const remaining = items.filter((i) => !order.includes(i))

  const addToOrder = (item: string) => setOrder((prev) => [...prev, item])
  const removeFromOrder = (item: string) => setOrder((prev) => prev.filter((i) => i !== item))

  return (
    <div className="space-y-3" dir="rtl">
      {order.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1.5">הסדר שלך (לחץ להסרה):</p>
          <div className="space-y-1.5">
            {order.map((item, i) => (
              <button
                key={item}
                onClick={() => removeFromOrder(item)}
                className="w-full flex items-center gap-2 text-right px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-sm text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <span className="font-bold text-indigo-400 shrink-0">{i + 1}.</span>
                <span>{item}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {remaining.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1.5">
            {order.length === 0 ? 'לחץ לפי סדר עדיפות:' : 'נשאר לדרג:'}
          </p>
          <div className="space-y-1.5">
            {remaining.map((item) => (
              <button
                key={item}
                onClick={() => addToOrder(item)}
                className="w-full text-right px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => onSubmit({ order })}
        disabled={disabled || order.length === 0}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        שלח תשובה ({order.length}/{items.length})
      </button>
    </div>
  )
}

// ─── Q&A ─────────────────────────────────────────────────────────────────────

function QAVote({ onSubmit, disabled }: Omit<Props, 'slide'>) {
  const [question, setQuestion] = useState('')
  const [justSent, setJustSent] = useState(false)

  const handleSubmit = () => {
    if (!question.trim()) return
    onSubmit({ question })
    setQuestion('')
    setJustSent(true)
    setTimeout(() => setJustSent(false), 2500)
  }

  return (
    <div className="space-y-3">
      {justSent && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-700">
          <span>✅</span> שאלתך נשלחה! אפשר לשלוח שאלה נוספת.
        </div>
      )}
      <input
        type="text"
        placeholder="כתוב את שאלתך כאן..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        className="w-full border-2 border-gray-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm focus:outline-none"
        dir="rtl"
        autoFocus={justSent}
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !question.trim()}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        שלח שאלה
      </button>
      <p className="text-xs text-gray-400 text-center">ניתן לשלוח מספר שאלות</p>
    </div>
  )
}
