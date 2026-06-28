import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Vote } from 'lucide-react'
import { API } from '../../lib/api'

export default function MentiJoinPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') ?? '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = code.replace(/\s/g, '')
    if (!trimmed) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/menti/join/${trimmed}`)
      if (!res.ok) { setError('קוד לא נמצא. נסה שוב.'); return }
      const data: { session: { id: string } | null } = await res.json()
      if (!data.session) { setError('הסשן טרם הפעיל. המתן למציג שיתחיל.'); return }
      navigate(`/menti/respond/${data.session.id}`)
    } catch {
      setError('שגיאת חיבור. נסה שוב.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 p-6" dir="rtl">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm text-center">
        <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Vote size={30} className="text-indigo-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">הצטרף להצבעה</h1>
        <p className="text-sm text-gray-500 mb-6">הכנס את הקוד שמציג המצגת</p>

        <form onSubmit={handleJoin} className="space-y-4">
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            placeholder="הכנס קוד"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={10}
            className="w-full text-center text-2xl font-mono font-bold tracking-widest border-2 border-gray-200 focus:border-indigo-500 rounded-xl px-4 py-3 focus:outline-none"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? 'מחפש...' : 'הצטרף'}
          </button>
        </form>
      </div>
    </div>
  )
}
