import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight, Plus, Play, GripVertical, Trash2, ChevronRight, ChevronLeft,
  ListChecks, Cloud, AlignLeft, Sliders, ListOrdered, HelpCircle,
  Copy, Check, X, Radio, Users, LogOut,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { API, makeAuthHeaders } from '../../lib/api'
import type { MentiPresentation, MentiSlide, SlideType } from '../types'
import { SLIDE_TYPE_LABELS } from '../types'
import SlideEditor from '../components/SlideEditor'

const SLIDE_ICONS: Record<SlideType, React.ElementType> = {
  multiple_choice: ListChecks,
  word_cloud: Cloud,
  open_text: AlignLeft,
  scale: Sliders,
  ranking: ListOrdered,
  qa: HelpCircle,
}

const SLIDE_TYPE_COLORS: Record<SlideType, { bg: string; text: string }> = {
  multiple_choice: { bg: 'bg-blue-100',   text: 'text-blue-600' },
  word_cloud:      { bg: 'bg-rose-100',    text: 'text-rose-500' },
  open_text:       { bg: 'bg-orange-100',  text: 'text-orange-500' },
  scale:           { bg: 'bg-violet-100',  text: 'text-violet-600' },
  ranking:         { bg: 'bg-green-100',   text: 'text-green-600' },
  qa:              { bg: 'bg-sky-100',     text: 'text-sky-600' },
}

const SLIDE_TYPES: SlideType[] = ['multiple_choice', 'word_cloud', 'open_text', 'scale', 'ranking', 'qa']

export default function MentiEditorPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const navigate = useNavigate()
  const headers = makeAuthHeaders(token)

  const [presentation, setPresentation] = useState<MentiPresentation | null>(null)
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null)
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleteSlideConfirm, setDeleteSlideConfirm] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(224)
  const [isDragging, setIsDragging] = useState(false)
  const [showModeModal, setShowModeModal] = useState(false)
  const [showFinishModal, setShowFinishModal] = useState(false)
  const isResizing = useRef(false)

  useEffect(() => {
    fetch(`${API}/api/menti/${id}`, { headers })
      .then((r) => r.json())
      .then((data: MentiPresentation) => {
        setPresentation(data)
        if (data.slides?.length > 0) setSelectedSlideId(data.slides[0].id)
      })
  }, [id])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const newWidth = Math.max(80, Math.min(480, window.innerWidth - e.clientX))
      setSidebarWidth(newWidth)
    }
    const onMouseUp = () => {
      if (isResizing.current) { isResizing.current = false; setIsDragging(false) }
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp) }
  }, [])

  const selectedSlide = presentation?.slides.find((s) => s.id === selectedSlideId) ?? null
  const selectedIndex = presentation?.slides.findIndex((s) => s.id === selectedSlideId) ?? -1

  const handleAddSlide = async (type: SlideType) => {
    setShowTypePicker(false)
    const atIndex = insertAfterIndex !== null ? insertAfterIndex + 1 : undefined
    setInsertAfterIndex(null)
    const res = await fetch(`${API}/api/menti/${id}/slides`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type, ...(atIndex !== undefined ? { insertAtIndex: atIndex } : {}) }),
    })
    const slide: MentiSlide = await res.json()
    setPresentation((prev) => {
      if (!prev) return prev
      const newSlides = [...prev.slides]
      if (atIndex !== undefined && atIndex <= newSlides.length) {
        newSlides.splice(atIndex, 0, slide)
        return { ...prev, slides: newSlides.map((s, i) => ({ ...s, order: i })) }
      }
      return { ...prev, slides: [...prev.slides, slide] }
    })
    setSelectedSlideId(slide.id)
  }

  const handleUpdateSlide = useCallback(
    async (slideId: string, patch: Partial<Pick<MentiSlide, 'question' | 'config'>>) => {
      setSaving(true)
      const res = await fetch(`${API}/api/menti/${id}/slides/${slideId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(patch),
      })
      const updated: MentiSlide = await res.json()
      setPresentation((prev) =>
        prev
          ? { ...prev, slides: prev.slides.map((s) => (s.id === slideId ? updated : s)) }
          : prev,
      )
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    },
    [id, token],
  )

  const handleDeleteSlide = async (slideId: string) => {
    await fetch(`${API}/api/menti/${id}/slides/${slideId}`, { method: 'DELETE', headers })
    setPresentation((prev) => {
      if (!prev) return prev
      const remaining = prev.slides.filter((s) => s.id !== slideId)
      if (selectedSlideId === slideId) setSelectedSlideId(remaining[0]?.id ?? null)
      return { ...prev, slides: remaining }
    })
    setDeleteSlideConfirm(null)
  }

  const handleUpdateTitle = async (title: string) => {
    await fetch(`${API}/api/menti/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ title }),
    })
    setPresentation((prev) => (prev ? { ...prev, title } : prev))
  }

  const openTypePicker = (afterIndex?: number) => {
    setInsertAfterIndex(afterIndex ?? null)
    setShowTypePicker(true)
  }

  if (!presentation) return <div className="flex-1 flex items-center justify-center text-gray-400">טוען...</div>

  const slideCount = presentation.slides.length

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden" dir="rtl">
      {/* Left sidebar – slide list */}
      <aside
        className={`flex flex-col border-l border-gray-100 bg-white relative ${sidebarOpen ? '' : 'w-10'}`}
        style={sidebarOpen ? { width: `${sidebarWidth}px`, transition: isDragging ? 'none' : 'width 150ms ease' } : undefined}
      >
        {sidebarOpen ? (
          <>
            <div
              onMouseDown={(e) => { e.preventDefault(); isResizing.current = true; setIsDragging(true) }}
              className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-300/60 active:bg-indigo-400/60 transition-colors z-10 select-none"
            />
            <div className="p-3 border-b border-gray-100 flex items-center gap-2">
              <button
                onClick={() => navigate('/menti')}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <ArrowRight size={16} />
              </button>
              <span className="text-xs font-medium text-gray-500 truncate flex-1">{presentation.title}</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
                title="כווץ"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {presentation.slides.map((slide, idx) => (
                <div key={slide.id}>
                  <button
                    onClick={() => setSelectedSlideId(slide.id)}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-right transition-colors text-xs group ${
                      selectedSlideId === slide.id
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <GripVertical size={12} className="text-gray-300 shrink-0" />
                    <span className="text-[10px] text-gray-400 shrink-0 w-4 text-center">{idx + 1}</span>
                    <span className="flex-1 min-w-0 truncate leading-snug">
                      {slide.question || SLIDE_TYPE_LABELS[slide.type]}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteSlideConfirm(slide.id) }}
                      className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </button>
                  {/* Insert-between button */}
                  <div className="relative flex items-center justify-center h-3 group/insert">
                    <div className="absolute inset-x-2 h-px bg-transparent group-hover/insert:bg-indigo-200 transition-colors" />
                    <button
                      onClick={() => openTypePicker(idx)}
                      className="absolute opacity-0 group-hover/insert:opacity-100 w-5 h-5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full flex items-center justify-center transition-all z-10 shadow-sm"
                      title="הוסף שקופית כאן"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2 border-t border-gray-100 space-y-1">
              <div className="text-center text-xs text-gray-400 py-0.5">{slideCount} שקופיות</div>
              <button
                onClick={() => openTypePicker()}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg py-2 font-medium transition-colors"
              >
                <Plus size={14} /> הוסף שקופית
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center py-3 gap-3">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-gray-600 transition-colors" title="הרחב">
              <ChevronLeft size={14} />
            </button>
            <div className="text-[10px] text-gray-400 [writing-mode:vertical-rl] select-none">{slideCount} שקופיות</div>
          </div>
        )}
      </aside>

      {/* Main editor area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50">
        {/* Top bar */}
        <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between gap-4">
          <input
            type="text"
            value={presentation.title}
            onChange={(e) => setPresentation((p) => p ? { ...p, title: e.target.value } : p)}
            onBlur={(e) => handleUpdateTitle(e.target.value)}
            className="text-base font-semibold text-gray-800 bg-transparent border-none focus:outline-none focus:ring-0 min-w-0"
            placeholder="שם המצגת"
          />
          <div className="flex items-center gap-2 shrink-0">
            {saving && <span className="text-xs text-gray-400">שומר...</span>}
            {saved && !saving && <span className="text-xs text-green-500 flex items-center gap-1"><Check size={11} /> נשמר</span>}

            <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2.5 py-1.5 rounded-lg">
              קוד:
              <span className="font-mono font-bold text-indigo-600">{presentation.joinCode}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/menti/join?code=${presentation.joinCode}`)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="text-gray-400 hover:text-indigo-600 transition-colors"
                title="העתק לינק הצטרפות"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>

            {/* Prominent Present button */}
            <button
              onClick={() => setShowModeModal(true)}
              disabled={slideCount === 0}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play size={15} fill="white" /> הצג מצגת
            </button>
          </div>
        </div>

        {/* Editor content */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedSlide ? (
            <SlideEditor
              key={selectedSlide.id}
              slide={selectedSlide}
              onSave={(patch) => handleUpdateSlide(selectedSlide.id, patch)}
              actions={
                <>
                  <button
                    onClick={() => openTypePicker(selectedIndex)}
                    className="flex items-center gap-1.5 py-2 px-4 rounded-xl border border-dashed border-indigo-300 text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 text-sm font-medium transition-all"
                  >
                    <Plus size={14} /> הוסף שאלה
                  </button>
                  <button
                    onClick={() => setShowFinishModal(true)}
                    className="flex items-center gap-1.5 py-2 px-4 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
                  >
                    <Check size={14} /> סיים עריכה
                  </button>
                </>
              }
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
              <button
                onClick={() => openTypePicker()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <Plus size={15} /> הוסף שקופית ראשונה
              </button>
            </div>
          )}
        </div>

        {/* Steps indicator – shown when more than 1 slide */}
        {slideCount > 1 && (
          <div className="bg-white border-t border-gray-100 px-4 py-3 shrink-0">
            <div className="flex items-center justify-center gap-1 overflow-x-auto">
              {presentation.slides.map((slide, idx) => {
                const Icon = SLIDE_ICONS[slide.type]
                const isSelected = slide.id === selectedSlideId
                return (
                  <button
                    key={slide.id}
                    onClick={() => setSelectedSlideId(slide.id)}
                    title={slide.question || SLIDE_TYPE_LABELS[slide.type]}
                    className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all min-w-[48px] group ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 group-hover:bg-gray-200'
                    }`}>
                      <Icon size={13} />
                    </div>
                    <span className={`text-[10px] font-semibold ${isSelected ? 'text-indigo-600' : ''}`}>
                      {idx + 1}
                    </span>
                  </button>
                )
              })}
              <button
                onClick={() => openTypePicker()}
                className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all min-w-[48px]"
                title="הוסף שקופית"
              >
                <div className="w-7 h-7 rounded-lg border-2 border-dashed border-current flex items-center justify-center">
                  <Plus size={12} />
                </div>
                <span className="text-[10px]">הוסף</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Slide type picker panel */}
      {showTypePicker && (
        <div className="fixed inset-0 z-50" onClick={() => setShowTypePicker(false)}>
          <div
            className="absolute top-0 right-0 h-full w-[380px] bg-white shadow-2xl border-l border-gray-100 overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h3 className="font-semibold text-gray-900 text-sm">הוסף שקופית</h3>
              <button onClick={() => setShowTypePicker(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 flex-1">
              <p className="text-xs text-gray-400 font-medium mb-3 px-1">שאלות אינטראקטיביות</p>
              <div className="grid grid-cols-2 gap-1.5">
                {SLIDE_TYPES.map((type) => {
                  const Icon = SLIDE_ICONS[type]
                  const colors = SLIDE_TYPE_COLORS[type]
                  return (
                    <button
                      key={type}
                      onClick={() => handleAddSlide(type)}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 text-right transition-colors group"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colors.bg}`}>
                        <Icon size={18} className={colors.text} />
                      </div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 leading-tight">
                        {SLIDE_TYPE_LABELS[type]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Presentation mode picker modal */}
      {showModeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" dir="rtl">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Play size={26} className="text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">איך תרצה להציג?</h3>
              <p className="text-sm text-gray-500 mt-1">בחר את מצב ההצגה למשתתפים</p>
            </div>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => { setShowModeModal(false); navigate(`/menti/${id}/present`, { state: { selfPaced: false } }) }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 text-right transition-all group"
              >
                <div className="w-11 h-11 bg-indigo-100 group-hover:bg-indigo-200 rounded-xl flex items-center justify-center shrink-0 transition-colors">
                  <Radio size={20} className="text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">שידור חי</p>
                  <p className="text-xs text-gray-500 mt-0.5">המשתתפים רואים את השאלה שאתה מציג בזמן אמת</p>
                </div>
              </button>

              <button
                onClick={() => { setShowModeModal(false); navigate(`/menti/${id}/present`, { state: { selfPaced: true } }) }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-teal-400 hover:bg-teal-50 text-right transition-all group"
              >
                <div className="w-11 h-11 bg-teal-100 group-hover:bg-teal-200 rounded-xl flex items-center justify-center shrink-0 transition-colors">
                  <Users size={20} className="text-teal-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">מילוי עצמי</p>
                  <p className="text-xs text-gray-500 mt-0.5">המשתתפים עוברים בין השאלות בעצמם בקצב שלהם</p>
                </div>
              </button>
            </div>

            <button onClick={() => setShowModeModal(false)} className="w-full py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Finish editing modal */}
      {showFinishModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" dir="rtl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">סיום עריכה</h3>
            <p className="text-sm text-gray-400 mb-5">מה תרצה לעשות עכשיו?</p>

            {/* Join code display */}
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-5">
              <span className="text-xs text-indigo-500 shrink-0">קוד הצטרפות:</span>
              <span className="font-mono font-bold text-indigo-700 text-lg tracking-widest flex-1">{presentation.joinCode}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/menti/join?code=${presentation.joinCode}`)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="text-indigo-400 hover:text-indigo-600 transition-colors"
                title="העתק לינק הצטרפות"
              >
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => { setShowFinishModal(false); setShowModeModal(true) }}
                disabled={slideCount === 0}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play size={16} fill="white" />
                <span className="font-semibold text-sm">הצג עכשיו</span>
              </button>
              <button
                onClick={() => navigate('/menti')}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <LogOut size={16} />
                <span className="font-semibold text-sm">יציאה מהמצגת</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete slide confirm modal */}
      {deleteSlideConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" dir="rtl">
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={20} className="text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">למחוק שקופית זו?</h3>
              <p className="text-sm text-gray-500 mt-1">פעולה זו לא ניתנת לביטול.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDeleteSlide(deleteSlideConfirm)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors"
              >
                מחק
              </button>
              <button
                onClick={() => setDeleteSlideConfirm(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold text-sm transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
