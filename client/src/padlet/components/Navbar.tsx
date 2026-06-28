import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, LogOut, Bell, X, ExternalLink, BarChart2, Vote } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUserNotifications } from '../hooks/useSocket';
import type { Notification } from '../types';
import { API, makeAuthHeaders } from '../../lib/api';
import Avatar from './Avatar';

export default function Navbar() {
  const { username, token, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isMenti = pathname.startsWith('/menti');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const authHeaders = makeAuthHeaders(token);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/notifications`, { headers: authHeaders });
      if (res.ok) setNotifications(await res.json());
    } catch {}
  }, [token]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useUserNotifications(username, (n) => {
    setNotifications(prev => [n as Notification, ...prev]);
  });

  const handleOpenNotif = async () => {
    setShowNotif(v => !v);
    if (!showNotif && unreadCount > 0) {
      try {
        await fetch(`${API}/api/notifications/read`, { method: 'PUT', headers: authHeaders });
        setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
      } catch {}
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await fetch(`${API}/api/notifications/${id}`, { method: 'DELETE', headers: authHeaders });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {}
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 text-orange-500 font-bold text-xl hover:opacity-80 transition-opacity">
          <div className="bg-orange-500 rounded-lg p-1.5">
            <LayoutGrid size={20} className="text-white" />
          </div>
        </Link>

        {/* System tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          <Link
            to="/"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              !isMenti
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutGrid size={14} />
            Padlet
          </Link>
          <Link
            to="/menti"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isMenti
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Vote size={14} />
            Mentimeter
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {!isMenti && (
          <Link to="/stats" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-600 transition-colors" title="סטטיסטיקות">
            <BarChart2 size={16} />
            <span className="hidden sm:inline">סטטיסטיקות</span>
          </Link>
        )}
        {isMenti && (
          <Link to="/menti/join" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors">
            <Vote size={16} />
            <span className="hidden sm:inline">הצטרף להצבעה</span>
          </Link>
        )}
        <span className="text-sm text-gray-600 font-medium">שלום, {username}</span>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleOpenNotif}
            className="relative p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
            title="התראות"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute left-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden" dir="rtl">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="font-semibold text-gray-800 text-sm">התראות</span>
                {notifications.length > 0 && (
                  <button
                    onClick={() => Promise.all(notifications.map(n => handleDismiss(n.id)))}
                    className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                  >
                    נקה הכל
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">אין התראות</div>
              ) : (
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {notifications.map(n => (
                    <div key={n.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-orange-50/50' : ''}`}>
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bell size={14} className="text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 leading-snug">{n.message}</p>
                        {n.board_id && (
                          <Link
                            to={`/board/${n.board_id}`}
                            onClick={() => setShowNotif(false)}
                            className="text-xs text-orange-500 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <ExternalLink size={10} /> עבור ללוח
                          </Link>
                        )}
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(n.created_at).toLocaleDateString('he-IL')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDismiss(n.id)}
                        className="text-gray-300 hover:text-gray-500 flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <Avatar username={username ?? '?'} size="md" />
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors"
          title="יציאה"
        >
          <LogOut size={16} />
          <span>יציאה</span>
        </button>
      </div>
    </nav>
  );
}
