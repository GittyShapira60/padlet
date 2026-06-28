import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, ArrowLeftRight, Plus, Settings, Users, Search, X,
  Maximize2, Minimize2, Download, Lock, CheckCircle, AlertCircle,
  Copy, FileText,
} from 'lucide-react';
import { Board, Post, BoardRole, BoardMember, canEdit as canEditRole, getBoardBgStyle } from '../types';
import { DuplicateDialog, type DuplicateOpts } from '../components/BoardSettingsModal';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import BoardSettingsModal from '../components/BoardSettingsModal';
import PasswordGate from '../components/PasswordGate';
import TimelineLayout from '../components/TimelineLayout';
import BrainstormLayout from '../components/BrainstormLayout';
import Spinner from '../components/Spinner';
import Avatar from '../components/Avatar';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../../context/AuthContext';
import { API, makeAuthHeaders } from '../../lib/api';

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timelineDir, setTimelineDir] = useState<'ltr' | 'rtl'>('rtl');
  const [clickPos, setClickPos] = useState({ x: 100, y: 100 });
  const [onlineCount, setOnlineCount] = useState(1);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [passwordAccepted, setPasswordAccepted] = useState(false);
  const [wrongPassword, setWrongPassword] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [exportError, setExportError] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };
  const { token, username } = useAuth();

  const authHeaders = makeAuthHeaders(token);

  const fetchBoard = async () => {
    if (!id) return;
    try {
      const [boardRes, membersRes, postsRes] = await Promise.all([
        fetch(`${API}/api/boards/${id}`, { headers: authHeaders }),
        fetch(`${API}/api/boards/${id}/members`, { headers: authHeaders }),
        fetch(`${API}/api/boards/${id}/posts`, { headers: authHeaders }),
      ]);

      if (boardRes.status === 403) { setAccessDenied(true); setLoading(false); return; }

      const boardData = await boardRes.json();
      const members = membersRes.ok ? await membersRes.json() : (boardData.members ?? []);
      setBoard({ ...boardData, members });
      if (boardData.timelineDirection) setTimelineDir(boardData.timelineDirection as 'ltr' | 'rtl');

      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(Array.isArray(postsData) ? postsData : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBoard(); }, [id]);

  useEffect(() => {
    if (!showMoreOptions && !showOnlineUsers) return;
    const handler = () => { setShowMoreOptions(false); setShowOnlineUsers(false); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showMoreOptions, showOnlineUsers]);

  const socketHandlers = {
    'post:created': useCallback((post: unknown) => {
      setPosts(prev => { const p = post as Post; if (prev.find(x => x.id === p.id)) return prev; return [...prev, p]; });
    }, []),
    'post:updated': useCallback((post: unknown) => {
      const p = post as Post;
      setPosts(prev => prev.map(x => x.id === p.id ? {
        ...p,
        comments: x.comments ?? [],
        liked_by_me: x.liked_by_me,
        poll_options: p.poll_options ?? x.poll_options,
      } : x));
    }, []),
    'post:deleted': useCallback((postId: unknown) => { setPosts(prev => prev.filter(x => x.id !== postId)); }, []),
    'post:moved': useCallback((data: unknown) => {
      const { postId, x, y } = data as { postId: string; x: number; y: number };
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, x, y } : p));
    }, []),
    'comment:created': useCallback((data: unknown) => {
      const { postId, comment } = data as { postId: string; comment: Post['comments'][0] };
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [...(p.comments ?? []), comment] } : p));
    }, []),
    'post:reactions': useCallback((data: unknown) => {
      const { postId, reactions } = data as { postId: string; reactions: { emoji: string; count: number; reacted_by_me: boolean }[] };
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions } : p));
    }, []),
    'post:likes': useCallback((data: unknown) => {
      const { postId, likes, liked_by } = data as { postId: string; likes: number; liked_by?: string[] };
      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p,
        likes,
        liked_by: liked_by ?? p.liked_by,
        liked_by_me: liked_by ? liked_by.includes(username ?? '') : p.liked_by_me,
      } : p));
    }, [username]),
    'board:updated': useCallback((updatedBoard: unknown) => {
      const b = updatedBoard as Board;
      setBoard(prev => prev ? { ...prev, ...b, my_role: prev.my_role } : null);
      if ((b as { timelineDirection?: string }).timelineDirection) {
        setTimelineDir((b as { timelineDirection: string }).timelineDirection as 'ltr' | 'rtl');
      }
    }, []),
    'role:updated': useCallback((data: unknown) => {
      const { role } = data as { boardId: string; role: BoardRole };
      setBoard(prev => prev ? { ...prev, my_role: role } : null);
    }, []),
    'room:count': useCallback((count: unknown) => { setOnlineCount(count as number); }, []),
    'room:users': useCallback((users: unknown) => { setOnlineUsers(users as string[]); }, []),
  };

  useSocket(id, socketHandlers);

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.post-card')) return;
    if (!board || !canEditRole(board.my_role)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setClickPos({
      x: e.clientX - rect.left + e.currentTarget.scrollLeft,
      y: e.clientY - rect.top + e.currentTarget.scrollTop,
    });
    setShowCreatePost(true);
  };

  const handleCreatePost = async (data: {
    content: string; type: string; color: string;
    image_url?: string; link_url?: string; link_title?: string;
    link_description?: string; link_image?: string; poll_options?: string[];
  }) => {
    if (!id) return;
    await fetch(`${API}/api/boards/${id}/posts`, {
      method: 'POST', headers: authHeaders,
      body: JSON.stringify({ ...data, author: username, x: clickPos.x, y: clickPos.y }),
    });
    setShowCreatePost(false);
  };

  const handleUpdatePost = async (postId: string, data: Partial<Post>) => {
    await fetch(`${API}/api/posts/${postId}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(data) });
  };

  const handleDeletePost = async (postId: string) => {
    await fetch(`${API}/api/posts/${postId}`, { method: 'DELETE', headers: authHeaders });
  };

  const handleAddComment = async (postId: string, content: string) => {
    await fetch(`${API}/api/posts/${postId}/comments`, {
      method: 'POST', headers: authHeaders, body: JSON.stringify({ content, author: username }),
    });
  };

  const handleUpdateBoard = async (data: Partial<Board>) => {
    if (!id) return;
    try {
      const { members: _ignored, ...boardData } = data as Board & { members?: unknown };
      const res = await fetch(`${API}/api/boards/${id}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(boardData) });
      if (!res.ok) throw new Error();
      const saved: Partial<Board> = await res.json();
      setBoard(prev => prev ? { ...prev, ...saved, members: prev.members, my_role: prev.my_role } : null);
      setShowSettings(false);
      showToast('ההגדרות נשמרו בהצלחה');
    } catch {
      showToast('שגיאה בשמירת ההגדרות', false);
    }
  };

  const handleUpdateBoardMembers = async (updatedMembers: BoardMember[]) => {
    if (!id || !board) return;
    const currentMembers = board.members ?? [];

    const toAddOrUpdate = updatedMembers.filter(m => {
      const existing = currentMembers.find(c => c.username === m.username);
      return !existing || existing.role !== m.role;
    });

    const toRemove = currentMembers.filter(c =>
      c.username !== board.owner && !updatedMembers.find(m => m.username === c.username)
    );

    const results = await Promise.all([
      ...toAddOrUpdate.map(m =>
        fetch(`${API}/api/boards/${id}/members`, {
          method: 'POST', headers: authHeaders,
          body: JSON.stringify({ username: m.username, role: m.role }),
        })
      ),
      ...toRemove.map(m =>
        fetch(`${API}/api/boards/${id}/members/${m.username}`, {
          method: 'DELETE', headers: authHeaders,
        })
      ),
    ]);

    const failed = results.find(r => !r.ok && r.status !== 204);
    if (failed) throw new Error(`Server error ${failed.status}`);

    const membersRes = await fetch(`${API}/api/boards/${id}/members`, { headers: authHeaders });
    if (membersRes.ok) {
      const freshMembers = await membersRes.json();
      setBoard(prev => prev ? { ...prev, members: freshMembers } : null);
    } else {
      setBoard(prev => prev ? { ...prev, members: updatedMembers } : null);
    }
  };

  const handleDuplicate = async (opts: DuplicateOpts) => {
    if (!id) return;
    const res = await fetch(`${API}/api/boards/${id}/duplicate`, {
      method: 'POST', headers: authHeaders,
      body: JSON.stringify({
        title: opts.title,
        posts_option: opts.posts_option,
        password_option: opts.password_option,
        members_option: opts.members_option,
        custom_password: opts.custom_password,
      }),
    });
    if (res.ok) {
      const newBoard = await res.json();
      navigate(`/board/${newBoard.id}`);
    }
  };

  const captureBoard = async (scale: number) => {
    const { default: html2canvas } = await import('html2canvas');
    const el = document.querySelector('.board-canvas') as HTMLElement;
    if (!el || !board) return null;

    const fullW = el.scrollWidth;
    const fullH = el.scrollHeight;

    // Save current inline styles
    const savedOverflow = el.style.overflow;
    const savedHeight   = el.style.height;
    const savedMaxH     = el.style.maxHeight;
    const savedFlex     = el.style.flex;

    // Expand element so html2canvas sees full content (no clipping)
    el.style.overflow  = 'visible';
    el.style.height    = `${fullH}px`;
    el.style.maxHeight = 'none';
    el.style.flex      = 'none';

    // Apply board background directly to the canvas element
    const bgStyle = getBoardBgStyle(board.background);
    const savedBg: Record<string, string> = {};
    Object.entries(bgStyle).forEach(([k, v]) => {
      savedBg[k] = (el.style as unknown as Record<string, string>)[k] ?? '';
      (el.style as unknown as Record<string, string>)[k] = v as string;
    });

    // Wait two animation frames so the browser re-paints before capture
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const canvas = await html2canvas(el, {
      useCORS: true, allowTaint: true,
      scale, logging: false,
      width: fullW, height: fullH,
      windowWidth: fullW, windowHeight: fullH,
      scrollX: 0, scrollY: 0,
      ignoreElements: (e: Element) => e.tagName === 'IFRAME',
    });

    // Restore
    el.style.overflow  = savedOverflow;
    el.style.height    = savedHeight;
    el.style.maxHeight = savedMaxH;
    el.style.flex      = savedFlex;
    Object.entries(savedBg).forEach(([k, v]) => {
      (el.style as unknown as Record<string, string>)[k] = v;
    });

    return canvas;
  };

  const handleExportImage = async () => {
    setShowMoreOptions(false);
    setExportError(false);
    await new Promise(r => setTimeout(r, 100));
    try {
      const canvas = await captureBoard(2);
      if (!canvas) return;
      const title = (board!.title || 'board').replace(/[<>"'\|?*:]/g, '').trim() || 'board';
      canvas.toBlob(blob => {
        if (!blob) { setExportError(true); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = title + '.png';
        document.body.appendChild(a); a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 300);
      }, 'image/png');
    } catch {
      setExportError(true);
    }
  };

  const handleExportPDF = async () => {
    setShowMoreOptions(false);
    setExportError(false);
    await new Promise(r => setTimeout(r, 100));
    try {
      const canvas = await captureBoard(1.5);
      if (!canvas) return;
      const { jsPDF } = await import('jspdf');
      const imgData = canvas.toDataURL('image/png');
      // Use a custom page sized exactly to the board content (in mm at 96 dpi)
      const PX_PER_MM = 96 / 25.4;
      const pageW = canvas.width  / 1.5 / PX_PER_MM;
      const pageH = canvas.height / 1.5 / PX_PER_MM;
      const pdf = new jsPDF({ orientation: pageH > pageW ? 'p' : 'l', unit: 'mm', format: [pageW, pageH] });
      pdf.addImage(imgData, 'PNG', 0, 0, pageW, pageH);
      const title = (board!.title || 'board').replace(/[<>"'\|?*:]/g, '').trim() || 'board';
      pdf.save(title + '.pdf');
    } catch {
      setExportError(true);
    }
  };

  const handlePasswordSubmit = (pw: string) => {
    if (board && pw === board.password) { setPasswordAccepted(true); setWrongPassword(false); }
    else setWrongPassword(true);
  };

  const handleResetPassword = async (): Promise<string> => {
    const res = await fetch(`${API}/api/boards/${id}/reset-password`, {
      method: 'POST', headers: authHeaders,
    });
    if (!res.ok) throw new Error('Reset failed');
    const data = await res.json();
    setBoard(prev => prev ? { ...prev, password: data.password } : null);
    return data.password as string;
  };

  const handleTimelineToggle = async () => {
    const next = timelineDir === 'ltr' ? 'rtl' : 'ltr';
    setTimelineDir(next);
    setShowMoreOptions(false);
    if (id) await fetch(`${API}/api/boards/${id}`, {
      method: 'PUT', headers: makeAuthHeaders(token),
      body: JSON.stringify({ timelineDirection: next }),
    });
  };

  const myRole: BoardRole = board?.my_role ?? 'viewer';
  const canPost = canEditRole(myRole);

  const filteredPosts = searchQuery.trim()
    ? posts.filter(p => {
        const q = searchQuery.toLowerCase();
        return (
          p.content.toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q) ||
          (p.link_title || '').toLowerCase().includes(q) ||
          (p.poll_options || []).some(opt => opt.option_text.toLowerCase().includes(q)) ||
          (p.comments || []).some(c => c.content.toLowerCase().includes(q) || c.author.toLowerCase().includes(q))
        );
      })
    : posts;

  if (loading) return (
    <div className="flex items-center justify-center h-[calc(100vh-64px)]">
      <Spinner />
    </div>
  );

  if (accessDenied) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] gap-4 text-gray-500">
      <div className="text-5xl">🚫</div>
      <p className="text-lg font-medium">אין לך גישה ללוח זה</p>
      <Link to="/" className="text-orange-500 hover:text-orange-600 text-sm">חזור לדף הבית</Link>
    </div>
  );

  if (!board) return <div className="text-center mt-20 text-gray-500">לוח לא נמצא</div>;

  if (board.password && !passwordAccepted) {
    return (
      <PasswordGate
        onSubmit={handlePasswordSubmit}
        error={wrongPassword}
        isOwner={board.owner === username}
        onResetPassword={handleResetPassword}
      />
    );
  }

  const postCardProps = {
    boardId: board.id,
    myRole,
    onUpdate: handleUpdatePost,
    onDelete: handleDeletePost,
    onAddComment: handleAddComment,
  };

  const openCreatePost = () => { setClickPos({ x: 100, y: 100 }); setShowCreatePost(true); };

  const doubleClickHint = canPost && (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white text-gray-700 text-xs px-4 py-1.5 rounded-lg pointer-events-none select-none whitespace-nowrap shadow-md border border-gray-200 no-print">
      לחץ פעמיים להוסיף פוסט
    </div>
  );

  return (
    <div
      className={isFullscreen ? 'fixed inset-0 z-50 flex flex-col' : 'flex flex-col flex-1 min-h-0'}
      style={getBoardBgStyle(board.background)}
    >
      {!isFullscreen && (
        <div className="bg-white/85 backdrop-blur-sm border-b border-black/8 px-3 py-2 flex items-center gap-2 shadow-sm relative z-10">
          {/* LEFT: back + title */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link to="/" className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
              <ArrowRight size={18} />
            </Link>
            <div className="min-w-0">
              <h1 className="font-bold text-gray-800 text-sm truncate leading-tight">{board.title}</h1>
              {board.description && <p className="text-xs text-gray-400 truncate leading-tight">{board.description}</p>}
            </div>
          </div>

          {/* CENTER: search — absolutely centered so it stays in the middle regardless of side widths */}
          <div className="absolute left-1/2 -translate-x-1/2 flex justify-center">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 w-80 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <Search size={15} className="text-gray-400 flex-shrink-0" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="חיפוש בלוח..."
                className="bg-transparent text-sm outline-none w-full text-gray-700 placeholder:text-gray-400"
                dir="rtl"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: users, post, more options */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="relative">
              <button
                onClick={e => { e.stopPropagation(); setShowOnlineUsers(v => !v); }}
                className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full hover:bg-green-100 transition-colors"
                title="משתמשים מחוברים"
              >
                <Users size={11} /><span>{onlineCount}</span>
              </button>
              {showOnlineUsers && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-2 w-44 z-30" onClick={e => e.stopPropagation()}>
                  <p className="text-xs font-medium text-gray-500 px-3 pb-1.5 border-b border-gray-100">מחוברים</p>
                  {onlineUsers.length === 0 ? (
                    <p className="text-xs text-gray-400 px-3 pt-2">אין נתונים</p>
                  ) : onlineUsers.map(u => (
                    <div key={u} className="flex items-center gap-2 px-3 py-1.5">
                      <Avatar username={u} size="sm" />
                      <span className="text-sm text-gray-700 truncate">{u}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {canPost && (
              <button onClick={openCreatePost}
                className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95">
                <Plus size={13} /> פוסט
              </button>
            )}

            {board.password && <span title="מוגן בסיסמה"><Lock size={13} className="text-amber-500 flex-shrink-0" /></span>}

            {/* More options */}
            <div className="relative">
              <button
                onClick={e => { e.stopPropagation(); setShowMoreOptions(v => !v); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <span>אפשרויות נוספות</span>
              </button>
              {showMoreOptions && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-48 z-30" onClick={e => e.stopPropagation()}>
                  <p className="text-[10px] font-semibold text-gray-400 px-3 pt-1.5 pb-1">הורדה</p>
                  <button onClick={handleExportImage}
                    className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-right flex items-center gap-2.5 transition-colors">
                    <Download size={13} className="text-gray-400" />
                    <span>ייצוא PNG</span>
                  </button>
                  <button onClick={handleExportPDF}
                    className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-right flex items-center gap-2.5 transition-colors">
                    <FileText size={13} className="text-gray-400" />
                    <span>ייצוא PDF</span>
                  </button>
                  <div className="h-px bg-gray-100 my-1" />
                  <button onClick={() => { setIsFullscreen(true); setShowMoreOptions(false); }}
                    className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-right flex items-center gap-2.5 transition-colors">
                    <Maximize2 size={13} className="text-gray-400" />
                    <span>מסך מלא</span>
                  </button>
                  {myRole === 'owner' && (
                    <>
                      <div className="h-px bg-gray-100 my-1" />
                      <button onClick={() => { setShowDuplicate(true); setShowMoreOptions(false); }}
                        className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-right flex items-center gap-2.5 transition-colors">
                        <Copy size={13} className="text-gray-400" />
                        <span>שכפל לוח</span>
                      </button>
                      <button onClick={() => { setShowSettings(true); setShowMoreOptions(false); }}
                        className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-right flex items-center gap-2.5 transition-colors">
                        <Settings size={13} className="text-gray-400" />
                        <span>הגדרות לוח</span>
                      </button>
                    </>
                  )}
                  {board.layout === 'timeline' && (
                    <>
                      <div className="h-px bg-gray-100 my-1" />
                      <button onClick={handleTimelineToggle}
                        className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-right flex items-center gap-2.5 transition-colors">
                        <ArrowLeftRight size={13} className="text-gray-400" />
                        <span>שנה כיוון ציר</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isFullscreen && (
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {canPost && (
            <button onClick={openCreatePost}
              className="flex items-center gap-1.5 bg-orange-500/90 hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium backdrop-blur-sm shadow-md">
              <Plus size={15} /> פוסט
            </button>
          )}
          <button onClick={() => setIsFullscreen(false)}
            className="p-2 bg-white/80 hover:bg-white text-gray-700 rounded-lg shadow-md backdrop-blur-sm transition-colors"
            title="יציאה ממסך מלא">
            <Minimize2 size={18} />
          </button>
        </div>
      )}

      {searchQuery && !isFullscreen && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-1.5 text-xs text-orange-700">
          נמצאו {filteredPosts.length} תוצאות עבור "{searchQuery}"
        </div>
      )}

      {exportError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-1.5 text-xs text-red-700 flex items-center justify-between">
          <span>לא ניתן לייצא תמונה. נסה PDF.</span>
          <button onClick={() => setExportError(false)} className="text-red-400 hover:text-red-600"><X size={13} /></button>
        </div>
      )}

      <div ref={boardRef} className="flex-1 flex flex-col overflow-hidden board-print-root" style={getBoardBgStyle(board.background)}>

        {board.layout === 'wall' && (
          <div className="board-canvas flex-1 overflow-auto no-select relative" onDoubleClick={handleCanvasDoubleClick}>
            <div className="relative" style={{ width: '100%', minHeight: 'calc(100vh - 120px)' }}>
              {filteredPosts.map(post => (
                <PostCard key={post.id} post={post} isGrid={false} {...postCardProps} />
              ))}
              {filteredPosts.length === 0 && !searchQuery && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none no-print">
                  <div className="bg-white/30 backdrop-blur-sm border border-white/50 rounded-2xl px-7 py-3.5 select-none">
                    <p className="text-sm font-medium text-gray-600">לחץ פעמיים להוסיף פוסט</p>
                  </div>
                </div>
              )}
            </div>
            {filteredPosts.length > 0 && doubleClickHint}
          </div>
        )}

        {board.layout === 'grid' && (
          <div className="flex-1 overflow-auto p-6 relative board-canvas" onDoubleClick={handleCanvasDoubleClick}>
            {filteredPosts.length === 0 && !searchQuery ? (
              <div className="flex flex-col items-center justify-center h-full pointer-events-none no-print">
                <div className="bg-white/30 backdrop-blur-sm border border-white/50 rounded-2xl px-7 py-3.5 select-none">
                  <p className="text-sm font-medium text-gray-600">לחץ פעמיים להוסיף פוסט</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredPosts.map(post => <PostCard key={post.id} post={post} isGrid={true} {...postCardProps} />)}
              </div>
            )}
            {filteredPosts.length > 0 && doubleClickHint}
          </div>
        )}

        {board.layout === 'brainstorm' && (
          <BrainstormLayout posts={filteredPosts} boardId={board.id} myRole={myRole}
            onUpdate={handleUpdatePost} onDelete={handleDeletePost} onAddComment={handleAddComment}
            onDoubleClick={canPost ? openCreatePost : undefined}
          />
        )}

        {board.layout === 'timeline' && (
          <TimelineLayout posts={filteredPosts} boardId={board.id} myRole={myRole}
            onUpdate={handleUpdatePost} onDelete={handleDeletePost} onAddComment={handleAddComment}
            onAddPost={openCreatePost} canPost={canPost} direction={timelineDir} />
        )}
      </div>

      {showCreatePost && canPost && (
        <CreatePostModal onClose={() => setShowCreatePost(false)} onCreate={handleCreatePost} />
      )}
      {showSettings && (
        <BoardSettingsModal board={board} onClose={() => setShowSettings(false)}
          onUpdate={handleUpdateBoard} onUpdateMembers={handleUpdateBoardMembers} />
      )}
      {showDuplicate && (
        <DuplicateDialog board={board} onConfirm={handleDuplicate} onClose={() => setShowDuplicate(false)} />
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium text-white transition-all ${toast.ok ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
