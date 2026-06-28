import type { MentiSlide, SlideResults as SlideResultsType } from '../types'
import type { MultipleChoiceConfig, RankingConfig, ScaleConfig } from '../types'
import BarChart from './charts/BarChart'
import WordCloud from './charts/WordCloud'
import ScaleResult from './charts/ScaleResult'
import RankingResult from './charts/RankingResult'
import OpenTextResult from './charts/OpenTextResult'

interface Props {
  slide: MentiSlide
  results: SlideResultsType | undefined
  dark?: boolean
  onMarkAnswered?: (responseId: string, isAnswered: boolean) => void
}

export default function SlideResults({ slide, results, dark = false, onMarkAnswered }: Props) {
  if (!results) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-sm">ממתין לתשובות...</p>
      </div>
    )
  }

  switch (slide.type) {
    case 'multiple_choice': {
      const cfg = slide.config as unknown as MultipleChoiceConfig
      const r = results as { tally: Record<string, number>; total: number }
      return <BarChart options={cfg.options ?? []} tally={r.tally} total={r.total} dark={dark} />
    }
    case 'word_cloud': {
      const r = results as { words: Record<string, number>; total: number }
      return <WordCloud words={r.words} total={r.total} dark={dark} />
    }
    case 'open_text': {
      const r = results as { texts: string[]; total: number }
      return <OpenTextResult texts={r.texts} total={r.total} dark={dark} />
    }
    case 'scale': {
      const cfg = slide.config as unknown as ScaleConfig
      const r = results as { average: number; distribution: Record<number, number>; total: number }
      return (
        <ScaleResult
          min={cfg.min ?? 1}
          max={cfg.max ?? 10}
          minLabel={cfg.minLabel ?? ''}
          maxLabel={cfg.maxLabel ?? ''}
          average={r.average}
          distribution={r.distribution}
          total={r.total}
          dark={dark}
        />
      )
    }
    case 'ranking': {
      const r = results as { ranked: { item: string; score: number; rank: number }[]; total: number }
      return <RankingResult ranked={r.ranked} total={r.total} dark={dark} />
    }
    case 'qa': {
      const r = results as { questions: { id: string; question: string; createdAt: string; isAnswered: boolean }[]; total: number }
      const open = r.questions.filter((q) => !q.isAnswered)
      const answered = r.questions.filter((q) => q.isAnswered)
      return (
        <div>
          <div className="max-h-72 overflow-y-auto space-y-2">
            {[...open].reverse().map((q) => (
              <div
                key={q.id}
                className={`rounded-xl px-4 py-2.5 text-sm flex items-start gap-2 ${
                  dark ? 'bg-white/10 text-white' : 'bg-gray-50 border border-gray-200 text-gray-800'
                }`}
              >
                <span className="shrink-0 mt-0.5">❓</span>
                <span className="flex-1 leading-snug">{q.question}</span>
                {onMarkAnswered && (
                  <button
                    onClick={() => onMarkAnswered(q.id, true)}
                    className="shrink-0 text-xs text-gray-400 hover:text-indigo-600 bg-white border border-gray-200 hover:border-indigo-300 px-2 py-0.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    טופל ✓
                  </button>
                )}
              </div>
            ))}
            {answered.length > 0 && (
              <details className="mt-1">
                <summary className={`text-xs cursor-pointer ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {answered.length} שאלות שטופלו
                </summary>
                <div className="mt-1.5 space-y-1.5">
                  {answered.map((q) => (
                    <div
                      key={q.id}
                      className={`rounded-xl px-4 py-2 text-sm flex items-start gap-2 opacity-50 ${
                        dark ? 'bg-white/5 text-white' : 'bg-gray-50 text-gray-500'
                      }`}
                    >
                      <span className="shrink-0">✅</span>
                      <span className="flex-1 leading-snug line-through">{q.question}</span>
                      {onMarkAnswered && (
                        <button
                          onClick={() => onMarkAnswered(q.id, false)}
                          className="shrink-0 text-xs text-gray-300 hover:text-gray-500 transition-colors whitespace-nowrap"
                        >
                          בטל
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
          <p className={`text-xs mt-2 text-left ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
            {open.length} פתוחות · {answered.length} טופלו
          </p>
        </div>
      )
    }
    default:
      return null
  }
}
