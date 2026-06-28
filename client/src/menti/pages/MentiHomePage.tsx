import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Play, Pencil, Trash2, Vote, Users, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { API, makeAuthHeaders } from '../../lib/api'
import type { MentiPresentation } from '../types'



export default function MentiHomePage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [presentations, setPresentations] = useState<(MentiPresentation & { slideCount: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [modePickerId, setModePickerId] = useState<string | null>(null)

  const headers = makeAuthHeaders(token)

  useEffect(() => {
    fetch(`${API}/api/menti`, { headers })
      .then((r) => r.json())
      .then(setPresentations)
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const res = await fetch(`${API}/api/menti`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: newTitle.trim() }),
      })
      const created = await res.json()
      navigate(`/menti/${created.id}/edit`)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`${API}/api/menti/${id}`, { method: 'DELETE', headers })
    if (res.ok || res.status === 204) {
      setPresentations((prev) => prev.filter((p) => p.id !== id))
    }
    setDeleteConfirm(null)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50" dir="rtl">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">המצגות שלי</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center animate-pulse">
              <Vote size={20} className="text-indigo-400" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">

            {/* New presentation card — clean */}
            <button
              onClick={() => setShowCreate(true)}
              className="h-52 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/40 flex flex-col items-center justify-center gap-3 text-indigo-400 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center transition-colors">
                <Plus size={22} />
              </div>
              <span className="text-sm font-semibold">מצגת חדשה</span>
            </button>

            {/* Existing presentations */}
            {presentations.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/menti/${p.id}/edit`)}
                className="h-52 rounded-2xl cursor-pointer relative overflow-hidden bg-white border-t-4 border-t-violet-600 border border-gray-200 hover:border-gray-300 transition-all shadow-sm hover:shadow-md flex flex-col"
              >
                {/* Top area — neutral placeholder */}
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <Vote size={36} className="text-gray-200" />
                </div>

                {/* Bottom info strip */}
                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">
                      {p.title || 'מצגת ללא שם'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.slideCount || p.slides?.length || 0} שקופיות
                      {' · '}
                      <span className="font-mono">{p.joinCode}</span>
                    </p>
                  </div>

                  {/* Action buttons — always visible */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); setModePickerId(p.id) }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="הצג"
                    >
                      <Play size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/menti/${p.id}/edit`) }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="ערוך"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(p.id) }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="מחק"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" dir="rtl">
            <h2 className="text-lg font-bold text-gray-900 mb-1">מצגת חדשה</h2>
            <p className="text-sm text-gray-400 mb-4">לאחר יצירת המצגת תועבר לעורך השקופיות</p>
            <input
              autoFocus
              type="text"
              placeholder="שם המצגת"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                disabled={creating || !newTitle.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors"
              >
                {creating ? 'יוצר...' : 'צור וערוך'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewTitle('') }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold text-sm transition-colors"
              >
                ביטול
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mode picker modal */}
      {modePickerId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" dir="rtl">
            <h2 className="text-lg font-bold text-gray-900 mb-1">בחר מצב הצגה</h2>
            <p className="text-sm text-gray-400 mb-5">כיצד המשתתפים יעברו בין השאלות?</p>

            <div className="space-y-3 mb-5">
              <button
                onClick={() => { navigate(`/menti/${modePickerId}/present`, { state: { selfPaced: false } }); setModePickerId(null) }}
                className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-right group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center shrink-0 transition-colors">
                  <ArrowLeft size={18} className="text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">הצגה רגילה</p>
                  <p className="text-xs text-gray-500 mt-0.5">המציג שולט על קצב המעבר בין השאלות</p>
                </div>
              </button>

              <button
                onClick={() => { navigate(`/menti/${modePickerId}/present`, { state: { selfPaced: true } }); setModePickerId(null) }}
                className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition-all text-right group"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-100 group-hover:bg-teal-200 flex items-center justify-center shrink-0 transition-colors">
                  <Users size={18} className="text-teal-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">מילוי עצמי</p>
                  <p className="text-xs text-gray-500 mt-0.5">כל משתתף עובר בין השאלות בקצב שלו</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setModePickerId(null)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold text-sm transition-colors"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" dir="rtl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={22} className="text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">למחוק את המצגת?</h3>
              <p className="text-sm text-gray-500 mt-1">כל השקופיות והתוצאות יימחקו לצמיתות.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors"
              >
                מחק
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
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
