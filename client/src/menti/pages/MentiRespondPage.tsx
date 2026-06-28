import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Vote, Clock, Lock, EyeOff, ChevronRight, ChevronLeft, FileText, FileSpreadsheet } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { API } from '../../lib/api'
import { useMentiAudience } from '../hooks/useMentiSocket'
import { exportToCSV, exportToPDF } from '../lib/mentiExport'
import type { SessionResults, SlideAnswer, SlideResults, SlideResultEntry } from '../types'
import VoteInterface from '../components/VoteInterface'
import SlideResultsView from '../components/SlideResults'

interface RespondSession {
  id: string
  currentSlideIndex: number
  isActive: boolean
  selfPaced: boolean
}

export default function MentiRespondPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { username } = useAuth()
  const navigate = useNavigate()

  const [slides, setSlides] = useState<SlideResultEntry[]>([])
  const [session, setSession] = useState<RespondSession | null>(null)
  const [slideResults, setSlideResults] = useState<Record<string, SlideResults>>({})
  const [voted, setVoted] = useState<Set<string>>(new Set())
  const [ended, setEnded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isVotingOpen, setIsVotingOpen] = useState(true)
  const [resultsVisible, setResultsVisible] = useState(true)
  // Self-paced: audience controls their own slide index
  const [localSlideIndex, setLocalSlideIndex] = useState(0)

  useEffect(() => {
    fetch(`${API}/api/menti/sessions/${sessionId}/results`)
      .then((r) => r.json())
      .then((data: SessionResults) => {
        const sess = data.session as RespondSession
        setSession(sess)
        setSlides(data.slides)
        const map: Record<string, SlideResults> = {}
        data.slides.forEach((s) => { map[s.slideId] = s.results })
        setSlideResults(map)
        if (!data.session.isActive) setEnded(true)
        setIsVotingOpen(data.session.isVotingOpen ?? true)
        setResultsVisible(data.session.resultsVisible ?? true)
        setLocalSlideIndex(data.session.currentSlideIndex ?? 0)
      })
      .finally(() => setLoading(false))
  }, [sessionId])

  useMentiAudience(sessionId, {
    onSlideChange: (idx) =>
      setSession((prev) => prev ? { ...prev, currentSlideIndex: idx } : prev),
    onSessionEnd: () => setEnded(true),
    onResultsUpdate: ({ slideId, results }) =>
      setSlideResults((prev) => ({ ...prev, [slideId]: results as SlideResults })),
    onVotingStateChange: (v) => setIsVotingOpen(v),
    onResultsVisibilityChange: (v) => setResultsVisible(v),
  })

  const isSelfPaced = session?.selfPaced ?? false
  const activeIndex = isSelfPaced ? localSlideIndex : (session?.currentSlideIndex ?? 0)
  const currentSlide = slides[activeIndex] ?? null
  const hasVoted = currentSlide ? voted.has(currentSlide.slideId) : false

  const handleVote = async (answer: SlideAnswer) => {
    if (!currentSlide) return
    if (hasVoted && currentSlide.type !== 'qa') return
    setSubmitting(true)
    try {
      await fetch(`${API}/api/menti/sessions/${sessionId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slideId: currentSlide.slideId,
          answer,
          respondent: username ?? undefined,
        }),
      })
      if (currentSlide.type !== 'qa') {
        setVoted((prev) => new Set(prev).add(currentSlide.slideId))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const slidesForExport: SlideResultEntry[] = slides.map((s) => ({
    ...s,
    results: slideResults[s.slideId] ?? s.results,
  }))

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-center">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Vote size={24} className="text-indigo-400" />
          </div>
          <p className="text-sm">מתחבר...</p>
        </div>
      </div>
    )
  }

  if (ended) {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-50" dir="rtl">
        <div className="max-w-2xl mx-auto p-6 pb-16">

          {/* Thank-you header */}
          <div
            className="text-center mb-8 bg-white rounded-2xl p-8 border border-gray-100 shadow-sm"
            style={{ animation: 'fadeSlideIn 0.4s ease-out both' }}
          >
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
                <polyline points="8,21 17,30 32,12" stroke="#4f46e5" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">תודה על השתתפותך!</h2>
            <p className="text-gray-500 text-sm">הסשן הסתיים — הנה התוצאות</p>

            {/* Export buttons */}
            <div className="flex gap-3 justify-center mt-5">
              <button
                onClick={() => exportToPDF(slidesForExport, 'סיכום תוצאות')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-sm font-semibold transition-colors"
              >
                <FileText size={15} /> הורד PDF
              </button>
              <button
                onClick={() => exportToCSV(slidesForExport, 'סיכום תוצאות')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-semibold transition-colors"
              >
                <FileSpreadsheet size={15} /> הורד Excel
              </button>
            </div>
          </div>

          {/* Slide results */}
          {slides.length > 0 && (
            <div className="space-y-4">
              {slides.map((slide, idx) => {
                const results = slideResults[slide.slideId]
                const slideForView = {
                  id: slide.slideId,
                  presentationId: '',
                  order: idx,
                  type: slide.type,
                  question: slide.question,
                  config: slide.config ?? {},
                  createdAt: '',
                }
                return (
                  <div
                    key={slide.slideId}
                    className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
                    style={{ animation: `fadeSlideIn 0.35s ease-out ${0.1 + idx * 0.08}s both` }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                        שאלה {idx + 1}
                      </span>
                      {results && (results as { total: number }).total > 0 && (
                        <span className="text-xs text-gray-400">{(results as { total: number }).total} תגובות</span>
                      )}
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-4 leading-snug">
                      {slide.question || 'שאלה ללא כותרת'}
                    </h4>
                    <SlideResultsView slide={slideForView} results={results} />
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-8 text-center">
            <button
              onClick={() => navigate('/menti')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm"
            >
              חזור לדף הבית
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!currentSlide) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Clock size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-500">ממתין לשאלה הבאה...</p>
        </div>
      </div>
    )
  }

  const currentResults = slideResults[currentSlide.slideId]
  const slideForVote = {
    id: currentSlide.slideId,
    presentationId: '',
    order: activeIndex,
    type: currentSlide.type,
    question: currentSlide.question,
    config: currentSlide.config ?? {},
    createdAt: '',
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-0" dir="rtl">
      {/* Top bar */}
      <div
        className="text-white px-4 py-3 flex items-center justify-between shrink-0"
        style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/menti')}
            className="text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            יציאה
          </button>
          <span className="text-sm font-medium">
            שאלה {activeIndex + 1} מתוך {slides.length}
          </span>
        </div>
        {currentResults && (currentResults as { total: number }).total > 0 && (
          <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full">
            {(currentResults as { total: number }).total} הצביעו
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex items-start justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 leading-snug">
              {currentSlide.question || 'שאלה ללא כותרת'}
            </h2>

            {currentSlide.type === 'qa' ? (
              <div className="space-y-5">
                {!isVotingOpen ? (
                  <div className="text-center py-6 bg-amber-50 border border-amber-200 rounded-xl">
                    <Lock size={22} className="mx-auto mb-2 text-amber-400" />
                    <p className="text-sm font-medium text-amber-700">ההצבעה סגורה — לא ניתן לשלוח שאלות כרגע</p>
                  </div>
                ) : (
                  <VoteInterface slide={slideForVote} onSubmit={handleVote} disabled={submitting} />
                )}
                {resultsVisible && currentResults && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">שאלות שנשלחו:</p>
                    <SlideResultsView slide={slideForVote} results={currentResults} />
                  </div>
                )}
              </div>
            ) : hasVoted ? (
              <div>
                <div className="flex items-center gap-2 mb-5 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <span className="text-xl">✅</span>
                  <span className="text-sm font-medium text-green-700">תשובתך נשלחה</span>
                  {!isSelfPaced && <span className="text-xs text-gray-400 mr-auto">ממתין לשאלה הבאה...</span>}
                </div>
                {resultsVisible
                  ? <SlideResultsView slide={slideForVote} results={currentResults} />
                  : (
                    <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100">
                      <EyeOff size={30} className="mx-auto mb-3 text-gray-300" />
                      <p className="text-sm font-medium text-gray-600">התוצאות מוסתרות כרגע</p>
                      <p className="text-xs text-gray-400 mt-1">המציג יחשוף אותן בזמן שיבחר</p>
                    </div>
                  )
                }
              </div>
            ) : !isVotingOpen ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-16 h-16 bg-white border border-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Lock size={28} className="text-gray-400" />
                </div>
                <p className="text-base font-semibold text-gray-700">ההצבעה סגורה כרגע</p>
                <p className="text-sm text-gray-400 mt-1.5">המציג יפתח את ההצבעה בקרוב — המתן כאן</p>
                <div className="flex justify-center gap-1 mt-5">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                  ))}
                </div>
              </div>
            ) : (
              <VoteInterface slide={slideForVote} onSubmit={handleVote} disabled={submitting} />
            )}
          </div>
        </div>
      </div>

      {/* Self-paced navigation */}
      {isSelfPaced && slides.length > 1 && (
        <div className="bg-white border-t border-gray-100 px-4 py-3 flex items-center justify-center gap-4 shrink-0">
          <button
            onClick={() => setLocalSlideIndex((i) => Math.max(0, i - 1))}
            disabled={localSlideIndex === 0}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
          >
            <ChevronRight size={16} /> קודם
          </button>

          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setLocalSlideIndex(i)}
                className={`rounded-full transition-all ${
                  i === localSlideIndex ? 'w-5 h-3 bg-indigo-500' : 'w-3 h-3 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setLocalSlideIndex((i) => Math.min(slides.length - 1, i + 1))}
            disabled={localSlideIndex === slides.length - 1}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
          >
            הבא <ChevronLeft size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
