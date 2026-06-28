import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, ListChecks, Cloud, AlignLeft, Sliders, ListOrdered, HelpCircle } from 'lucide-react'
import type { MentiSlide, SlideType } from '../types'
import type { MultipleChoiceConfig, RankingConfig, ScaleConfig } from '../types'
import { SLIDE_TYPE_LABELS } from '../types'

const SLIDE_ICONS: Record<SlideType, React.ElementType> = {
  multiple_choice: ListChecks,
  word_cloud: Cloud,
  open_text: AlignLeft,
  scale: Sliders,
  ranking: ListOrdered,
  qa: HelpCircle,
}

interface Props {
  slide: MentiSlide
  onSave: (patch: Partial<Pick<MentiSlide, 'question' | 'config'>>) => void
  actions?: React.ReactNode
}

interface ConfigEditorProps<T> {
  config: T
  onChange: (patch: Record<string, unknown>, commit?: boolean) => void
  onBlur: () => void
}

export default function SlideEditor({ slide, onSave, actions }: Props) {
  const [question, setQuestion] = useState(slide.question)
  const [config, setConfig] = useState(slide.config)

  // refs always hold the latest values — safe to read in callbacks without stale closures
  const questionRef = useRef(slide.question)
  const configRef = useRef(slide.config)
  const onSaveRef = useRef(onSave)

  useEffect(() => { onSaveRef.current = onSave })

  useEffect(() => {
    setQuestion(slide.question)
    setConfig(slide.config)
    questionRef.current = slide.question
    configRef.current = slide.config
  }, [slide.id])

  // Save when the user navigates away or switches slides (no blur fires in those cases)
  useEffect(() => {
    return () => {
      onSaveRef.current({ question: questionRef.current, config: configRef.current })
    }
  }, [])

  const save = () => onSave({ question: questionRef.current, config: configRef.current })

  const handleQuestionChange = (q: string) => {
    setQuestion(q)
    questionRef.current = q
  }

  const updateConfig = (patch: Record<string, unknown>, commit = false) => {
    const next = { ...configRef.current, ...patch }
    setConfig(next)
    configRef.current = next
    if (commit) onSave({ question: questionRef.current, config: next })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 w-full" dir="rtl">
      <div className="flex items-center gap-2.5 mb-5">
        {(() => { const Icon = SLIDE_ICONS[slide.type]; return <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0"><Icon size={16} className="text-indigo-600" /></div> })()}
        <span className="text-sm font-medium text-gray-600">{SLIDE_TYPE_LABELS[slide.type]}</span>
      </div>

      <div className="mb-5">
        <label className="block text-xs font-medium text-gray-500 mb-1.5">שאלה</label>
        <input
          type="text"
          value={question}
          onChange={(e) => handleQuestionChange(e.target.value)}
          onBlur={save}
          placeholder="הכנס את השאלה שלך..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {slide.type === 'multiple_choice' && (
        <MultipleChoiceConfigEditor
          config={config as unknown as MultipleChoiceConfig}
          onChange={updateConfig}
          onBlur={save}
        />
      )}
      {slide.type === 'scale' && (
        <ScaleConfigEditor
          config={config as unknown as ScaleConfig}
          onChange={updateConfig}
          onBlur={save}
        />
      )}
      {slide.type === 'ranking' && (
        <RankingConfigEditor
          config={config as unknown as RankingConfig}
          onChange={updateConfig}
          onBlur={save}
        />
      )}

      {actions && (
        <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-gray-100">
          {actions}
        </div>
      )}
    </div>
  )
}

// ─── Multiple Choice ──────────────────────────────────────────────────────────

function MultipleChoiceConfigEditor({ config, onChange, onBlur }: ConfigEditorProps<MultipleChoiceConfig>) {
  const options = config.options ?? []

  const updateOption = (i: number, val: string) => {
    const next = [...options]
    next[i] = val
    onChange({ options: next }) // state only — saved on blur
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-2">אפשרויות</label>
      <div className="space-y-2 mb-3">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0">
              {i + 1}
            </div>
            <input
              type="text"
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              onBlur={onBlur}
              className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={() => onChange({ options: options.filter((_, idx) => idx !== i) }, true)}
              disabled={options.length <= 2}
              className="text-gray-300 hover:text-red-400 disabled:opacity-30 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => onChange({ options: [...options, `אפשרות ${options.length + 1}`] }, true)}
        className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        <Plus size={13} /> הוסף אפשרות
      </button>

      <label className="flex items-center gap-2 mt-4 cursor-pointer">
        <input
          type="checkbox"
          checked={config.allowMultiple ?? false}
          onChange={(e) => onChange({ allowMultiple: e.target.checked }, true)}
          className="rounded text-indigo-600"
        />
        <span className="text-xs text-gray-600">אפשר בחירה מרובה</span>
      </label>
    </div>
  )
}

// ─── Scale ────────────────────────────────────────────────────────────────────

function ScaleConfigEditor({ config, onChange, onBlur }: ConfigEditorProps<ScaleConfig>) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">ערך מינימום</label>
        <input
          type="number"
          value={config.min ?? 1}
          onChange={(e) => onChange({ min: parseInt(e.target.value) || 1 })}
          onBlur={onBlur}
          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">ערך מקסימום</label>
        <input
          type="number"
          value={config.max ?? 10}
          onChange={(e) => onChange({ max: parseInt(e.target.value) || 2 })}
          onBlur={onBlur}
          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">תווית שמאל</label>
        <input
          type="text"
          value={config.minLabel ?? ''}
          onChange={(e) => onChange({ minLabel: e.target.value })}
          onBlur={onBlur}
          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">תווית ימין</label>
        <input
          type="text"
          value={config.maxLabel ?? ''}
          onChange={(e) => onChange({ maxLabel: e.target.value })}
          onBlur={onBlur}
          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>
  )
}

// ─── Ranking ──────────────────────────────────────────────────────────────────

function RankingConfigEditor({ config, onChange, onBlur }: ConfigEditorProps<RankingConfig>) {
  const items = config.items ?? []

  const updateItem = (i: number, val: string) => {
    const next = [...items]
    next[i] = val
    onChange({ items: next }) // state only — saved on blur
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-2">פריטים לדירוג</label>
      <div className="space-y-2 mb-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-5 text-center">{i + 1}.</span>
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
              onBlur={onBlur}
              className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) }, true)}
              disabled={items.length <= 2}
              className="text-gray-300 hover:text-red-400 disabled:opacity-30 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => onChange({ items: [...items, `פריט ${items.length + 1}`] }, true)}
        className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        <Plus size={13} /> הוסף פריט
      </button>
    </div>
  )
}
