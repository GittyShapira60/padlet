import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  ChevronRight, ChevronLeft, X, Users, ArrowRight, Vote,
  CheckCircle as CheckCircleIcon, Lock, Unlock, Eye, EyeOff,
  RotateCcw, Copy, Check, FileText, FileSpreadsheet, Radio, Settings,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { API, makeAuthHeaders } from '../../lib/api'
import { useMentiPresenter } from '../hooks/useMentiSocket'
import { exportToCSV, exportToPDF } from '../lib/mentiExport'
import type { MentiPresentation, MentiSession, SessionResults, SlideResultEntry, SlideResults } from '../types'
import { SLIDE_TYPE_LABELS } from '../types'
import SlideResultsView from '../components/SlideResults'

export default function MentiPresentPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const headers = makeAuthHeaders(token)
  const selfPaced: boolean = (location.state as { selfPaced?: boolean } | null)?.selfPaced ?? false

  const [presentation, setPresentation] = useState<MentiPresentation | null>(null)
  const [session, setSession] = useState<MentiSession | null>(null)
  const [results, setResults] = useState<Record<string, SlideResults>>({})
  const [slides, setSlides] = useState<SlideResultEntry[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showEndModal, setShowEndModal] = useState(false)
  const [isVotingOpen, setIsVotingOpen] = useState(true)
  const [resultsVisible, setResultsVisible] = useState(true)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const init = async () => {
      const [presRes, sessRes] = await Promise.all([
        fetch(`${API}/api/menti/${id}`, { headers }),
        fetch(`${API}/api/menti/${id}/sessions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ selfPaced }),
        }),
      ])
      const pres: MentiPresentation = await presRes.json()
      const sess: MentiSession = await sessRes.json()
      setPresentation(pres)
      setSession(sess)
      setCurrentIndex(0)

      const resultsRes = await fetch(`${API}/api/menti/sessions/${sess.id}/results`)
      const data: SessionResults = await resultsRes.json()
      const map: Record<string, SlideResults> = {}
      data.slides.forEach((s) => { map[s.slideId] = s.results })
      setResults(map)
      setSlides(data.slides)
      setIsVotingOpen(data.session.isVotingOpen ?? true)
      setResultsVisible(data.session.resultsVisible ?? true)
    }
    init()
  }, [id])

  useMentiPresenter(session?.id, (data) => {
    setResults((prev) => ({ ...prev, [data.slideId]: data.results as SlideResults }))
  })

  const changeSlide = async (newIndex: number) => {
    if (!session) return
    setCurrentIndex(newIndex)
    await fetch(`${API}/api/menti/sessions/${session.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ currentSlideIndex: newIndex }),
    })
  }

  const endSession = async () => {
    if (!session) return
    await fetch(`${API}/api/menti/sessions/${session.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ isActive: false }),
    })
    navigate('/menti')
  }

  const toggleVoting = async () => {
    if (!session) return
    const next = !isVotingOpen
    setIsVotingOpen(next)
    await fetch(`${API}/api/menti/sessions/${session.id}`, {
      method: 'PUT', headers, body: JSON.stringify({ isVotingOpen: next }),
    })
  }

  const toggleResultsVisible = async () => {
    if (!session) return
    const next = !resultsVisible
    setResultsVisible(next)
    await fetch(`${API}/api/menti/sessions/${session.id}`, {
      method: 'PUT', headers, body: JSON.stringify({ resultsVisible: next }),
    })
  }

  const resetCurrentResults = async () => {
    if (!session || !currentSlide) return
    await fetch(`${API}/api/menti/sessions/${session.id}/slides/${currentSlide.id}/results`, {
      method: 'DELETE', headers,
    })
    setResults((prev) => { const next = { ...prev }; delete next[currentSlide.id]; return next })
    setResetConfirm(false)
  }

  const markAnswered = async (responseId: string, isAnswered: boolean) => {
    if (!session) return
    await fetch(`${API}/api/menti/sessions/${session.id}/responses/${responseId}/answered`, {
      method: 'PUT', headers, body: JSON.stringify({ isAnswered }),
    })
  }

  const copyJoinLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/menti/join?code=${presentation?.joinCode ?? ''}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const slidesForExport: SlideResultEntry[] = slides.map((s) => ({
    ...s,
    results: results[s.slideId] ?? s.results,
  }))

  if (!presentation || !session) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Vote size={28} className="text-indigo-400" />
          </div>
          <p className="text-gray-400 text-sm">טוען...</p>
        </div>
      </div>
    )
  }

  const presentationSlides = presentation.slides
  const currentSlide = presentationSlides[currentIndex]
  const currentResults = currentSlide ? results[currentSlide.id] : undefined
  const responseCount = currentResults ? (currentResults as { total: number }).total : 0

  return (
    <div className="flex-1 flex flex-col text-gray-900 overflow-hidden bg-gray-50" dir="rtl">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/menti')}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition-all"
          >
            <ArrowRight size={13} /> יציאה
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <span className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">{presentation.title}</span>
          <span className="text-xs text-gray-400">{currentIndex + 1} / {presentationSlides.length}</span>
          {selfPaced && (
            <span className="flex items-center gap-1 text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full">
              <Users size={10} /> מילוי עצמי
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Join code – always visible */}
          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5">
            <span className="text-xs text-indigo-600">קוד:</span>
            <span className="font-mono font-bold text-indigo-700 text-sm tracking-widest">{presentation.joinCode}</span>
            <button onClick={copyJoinLink} className="text-indigo-400 hover:text-indigo-600 transition-colors" title="העתק לינק">
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>

          {/* Settings button */}
          <div className="relative">
            <button
              onClick={() => setShowSettings((v) => !v)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                showSettings ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <Settings size={13} /> הגדרות
            </button>

            {showSettings && (
              <>
                {/* backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                <div className="absolute left-0 top-full mt-2 z-50 bg-white rounded-2xl border border-gray-100 shadow-xl p-3 w-64" dir="rtl">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">הגדרות הצגה</p>

                  {/* Voting toggle */}
                  <button
                    onClick={toggleVoting}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-1 ${
                      isVotingOpen ? 'text-green-700 hover:bg-green-50' : 'text-amber-700 hover:bg-amber-50'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isVotingOpen ? 'bg-green-100' : 'bg-amber-100'}`}>
                      {isVotingOpen ? <Unlock size={14} /> : <Lock size={14} />}
                    </div>
                    <div className="text-right">
                      <p>{isVotingOpen ? 'הצבעה פתוחה' : 'הצבעה סגורה'}</p>
                      <p className="text-[11px] font-normal text-gray-400">{isVotingOpen ? 'לחץ לסגור' : 'לחץ לפתוח'}</p>
                    </div>
                  </button>

                  {/* Results toggle */}
                  <button
                    onClick={toggleResultsVisible}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-1 ${
                      resultsVisible ? 'text-blue-700 hover:bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${resultsVisible ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      {resultsVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </div>
                    <div className="text-right">
                      <p>{resultsVisible ? 'תוצאות גלויות' : 'תוצאות מוסתרות'}</p>
                      <p className="text-[11px] font-normal text-gray-400">{resultsVisible ? 'לחץ להסתיר' : 'לחץ להציג'}</p>
                    </div>
                  </button>

                  <div className="border-t border-gray-100 my-2" />

                  {/* Reset */}
                  <button
                    onClick={() => { setShowSettings(false); setResetConfirm(true) }}
                    disabled={!currentSlide}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                      <RotateCcw size={14} />
                    </div>
                    <div className="text-right">
                      <p>אפס תוצאות שאלה</p>
                      <p className="text-[11px] font-normal text-gray-400">מחיקת תשובות לשאלה הנוכחית</p>
                    </div>
                  </button>

                  {/* Response count */}
                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2 px-3 py-1.5">
                    <Users size={13} className="text-gray-400" />
                    <span className="text-xs text-gray-500">{responseCount} הצביעו בשאלה זו</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Prominent End button */}
          <button
            onClick={() => setShowEndModal(true)}
            className="flex items-center gap-1.5 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow-md"
          >
            <X size={14} /> סיים הצגה
          </button>
        </div>
      </div>

      {/* Slide display */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
        {currentSlide ? (
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider mb-3">
              {SLIDE_TYPE_LABELS[currentSlide.type]}
            </p>
            <h2 className="text-3xl font-bold text-gray-900 mb-8 leading-snug">
              {currentSlide.question || 'שאלה ללא כותרת'}
            </h2>
            <SlideResultsView
              slide={currentSlide}
              results={currentResults}
              onMarkAnswered={currentSlide.type === 'qa' ? markAnswered : undefined}
            />
          </div>
        ) : (
          <p className="text-gray-400">אין שקופיות</p>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-center gap-6 py-5 border-t border-gray-100 bg-white shrink-0">
        <button
          onClick={() => changeSlide(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base font-semibold"
        >
          <ChevronRight size={20} /> קודם
        </button>

        <div className="flex gap-2">
          {presentationSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => changeSlide(i)}
              className={`rounded-full transition-all ${
                i === currentIndex ? 'w-5 h-3 bg-indigo-500' : 'w-3 h-3 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

        {currentIndex === presentationSlides.length - 1 ? (
          <button
            onClick={() => setShowEndModal(true)}
            className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white transition-colors text-base font-semibold shadow-sm"
          >
            סיים הצגה <X size={18} />
          </button>
        ) : (
          <button
            onClick={() => changeSlide(currentIndex + 1)}
            className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors text-base font-semibold"
          >
            הבא <ChevronLeft size={20} />
          </button>
        )}
      </div>

      {/* Reset confirm modal */}
      {resetConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" dir="rtl">
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <RotateCcw size={22} className="text-indigo-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">לאפס תוצאות השאלה?</h3>
              <p className="text-sm text-gray-500 mt-1">כל התשובות לשאלה זו יימחקו.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={resetCurrentResults} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors">אפס</button>
              <button onClick={() => setResetConfirm(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold text-sm transition-colors">ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* End session modal – with export options */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" dir="rtl">
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircleIcon size={24} className="text-orange-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">לסיים את ההצגה?</h3>
              <p className="text-sm text-gray-500 mt-1.5">המשתתפים יראו מסך סיום עם תוצאות הסקר.</p>
            </div>

            {/* Export buttons */}
            <div className="mb-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 mb-2">הורד תוצאות:</p>
              <div className="flex gap-2">
                <button
                  onClick={() => exportToPDF(slidesForExport, presentation.title)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition-colors"
                >
                  <FileText size={14} /> PDF
                </button>
                <button
                  onClick={() => exportToCSV(slidesForExport, presentation.title)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors"
                >
                  <FileSpreadsheet size={14} /> Excel / CSV
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={endSession} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors">
                סיים סשן
              </button>
              <button onClick={() => setShowEndModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold text-sm transition-colors">
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
