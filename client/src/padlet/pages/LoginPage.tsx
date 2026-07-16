import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Vote } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API = '';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      login(data.token, data.username);
      navigate('/');
    } catch {
      setError('שגיאת חיבור לשרת');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Product badges */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
            <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
              <LayoutGrid size={15} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Padlet</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-gray-300" />
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Vote size={15} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Mentimeter</span>
          </div>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-7">
            <h1 className="text-2xl font-bold text-gray-900">ברוכים הבאים</h1>
            <p className="text-sm text-gray-400 mt-1">כניסה לפלטפורמת הלמידה האינטראקטיבית</p>
          </div>

          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'login' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>
              כניסה
            </button>
            <button onClick={() => setMode('register')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'register' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>
              הרשמה
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם משתמש</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-right focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50 focus:bg-white transition-colors"
                placeholder="הכנס שם משתמש" required dir="rtl" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-right focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50 focus:bg-white transition-colors"
                placeholder="הכנס סיסמה" required dir="rtl" />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm text-right">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-gray-900 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
              {loading ? '...' : mode === 'login' ? 'כניסה' : 'הרשמה'}
            </button>
          </form>

          {mode === 'login' && (
            <p className="text-center text-xs text-gray-400 mt-4">
              משתמש חדש? עבור לכרטיסיית <strong className="text-gray-600">הרשמה</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
