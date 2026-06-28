import { useState } from 'react';
import { Lock, Key, CheckCircle } from 'lucide-react';

interface Props {
  onSubmit: (pw: string) => void;
  error: boolean;
  isOwner: boolean;
  onResetPassword: () => Promise<string>;
}

export default function PasswordGate({ onSubmit, error, isOwner, onResetPassword }: Props) {
  const [pw, setPw] = useState('');
  const [resetPhase, setResetPhase] = useState<'idle' | 'confirm' | 'done'>('idle');
  const [newPw, setNewPw] = useState('');
  const [resetting, setResetting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      const generated = await onResetPassword();
      setNewPw(generated);
      setResetPhase('done');
    } finally {
      setResetting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(newPw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-center h-[calc(100vh-64px)]">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center space-y-4">

        {resetPhase === 'idle' && (
          <>
            <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto">
              <Lock size={22} className="text-orange-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">לוח מוגן בסיסמה</h2>
            <input autoFocus type="password" value={pw} onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && pw && onSubmit(pw)}
              placeholder="הכנס סיסמה..."
              className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${error ? 'border-red-400' : 'border-gray-300'}`}
              dir="rtl" />
            {error && <p className="text-red-500 text-sm">סיסמה שגויה, נסה שנית</p>}
            <button onClick={() => pw && onSubmit(pw)}
              className="w-full py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors">
              כניסה
            </button>
            {isOwner && (
              <button onClick={() => setResetPhase('confirm')}
                className="text-xs text-gray-400 hover:text-orange-500 transition-colors">
                שכחתי סיסמה
              </button>
            )}
          </>
        )}

        {resetPhase === 'confirm' && (
          <>
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
              <Key size={22} className="text-amber-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">צור סיסמה חדשה</h2>
            <p className="text-sm text-gray-500">תיווצר סיסמה חדשה ללוח. כל חברי הלוח יקבלו התראה לפנות אליך לקבלתה.</p>
            <div className="flex gap-2">
              <button onClick={() => setResetPhase('idle')}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                ביטול
              </button>
              <button onClick={handleReset} disabled={resetting}
                className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-60 transition-colors">
                {resetting ? 'יוצר...' : 'צור סיסמה חדשה'}
              </button>
            </div>
          </>
        )}

        {resetPhase === 'done' && (
          <>
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={22} className="text-green-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">הסיסמה אופסה!</h2>
            <p className="text-sm text-gray-500">הסיסמה החדשה שלך:</p>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <span className="flex-1 font-mono text-lg font-bold text-gray-800 tracking-widest">{newPw}</span>
              <button onClick={handleCopy}
                className={`text-xs px-2 py-1 rounded-lg transition-colors ${copied ? 'bg-green-100 text-green-700' : 'bg-gray-200 hover:bg-gray-300 text-gray-600'}`}>
                {copied ? 'הועתק!' : 'העתק'}
              </button>
            </div>
            <p className="text-xs text-amber-600">שמרי את הסיסמה — כל חברי הלוח קיבלו התראה לפנות אליך.</p>
            <button onClick={() => onSubmit(newPw)}
              className="w-full py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors">
              כניסה עם הסיסמה החדשה
            </button>
          </>
        )}
      </div>
    </div>
  );
}
