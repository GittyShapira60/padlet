import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Copy, Lock, Users, AlertTriangle, CheckCircle, StickyNote, LayoutGrid as LayoutGridIcon, Lightbulb, CalendarDays } from 'lucide-react';
import { Board, getBoardBgStyle } from '../types';
import CreateBoardModal from '../components/CreateBoardModal';
import Spinner from '../components/Spinner';
import { useAuth } from '../../context/AuthContext';
import { DuplicateDialog } from '../components/BoardSettingsModal';
import type { DuplicateOpts } from '../components/BoardSettingsModal';
import { useUserNotifications } from '../hooks/useSocket';
import { API, makeAuthHeaders } from '../../lib/api';

const LAYOUT_ICONS: Record<string, React.ReactNode> = {
  wall:       <StickyNote size={13} />,
  grid:       <LayoutGridIcon size={13} />,
  brainstorm: <Lightbulb size={13} />,
  timeline:   <CalendarDays size={13} />,
};

const LAYOUT_LABELS: Record<string, string> = {
  wall:       'לוח קיר',
  grid:       'לוח רשת',
  brainstorm: 'סיעור מוחות',
  timeline:   'ציר זמן',
};

function BoardCard({
  board,
  onNavigate,
  onDelete,
  onDuplicate,
}: {
  board: Board;
  onNavigate: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onDuplicate: (e: React.MouseEvent) => void;
}) {
  const isOwner = board.my_role === 'owner';

  return (
    <div
      onClick={onNavigate}
      className="h-52 rounded-2xl cursor-pointer relative overflow-hidden shadow-sm hover:shadow-lg transition-all group hover:-translate-y-1 border border-black/5"
      style={getBoardBgStyle(board.background)}
    >
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />

      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <div className="relative group/layouticon">
          <div className="bg-white/90 backdrop-blur-sm rounded-md p-1.5 text-gray-600 shadow-sm border border-black/5">
            {LAYOUT_ICONS[board.layout] ?? <StickyNote size={13} />}
          </div>
          <div className="absolute top-full right-0 mt-1.5 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover/layouticon:opacity-100 transition-opacity pointer-events-none z-20">
            {LAYOUT_LABELS[board.layout] ?? 'לוח'}
            <div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900 rotate-45" />
          </div>
        </div>
        {board.password && (
          <div className="bg-white/70 backdrop-blur-sm rounded-md p-1.5">
            <Lock size={11} className="text-gray-500" />
          </div>
        )}
      </div>

      {!isOwner && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/70 backdrop-blur-sm text-gray-600 text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <Users size={10} />
          <span>משותף איתי</span>
        </div>
      )}

      {isOwner && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <button
            onClick={onDelete}
            className="bg-white/95 backdrop-blur-sm rounded-lg p-2 hover:bg-red-50 hover:text-red-500 transition-all text-gray-600 shadow border border-black/10 hover:scale-110"
            title="מחק לוח"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={onDuplicate}
            className="bg-white/95 backdrop-blur-sm rounded-lg p-2 hover:bg-blue-50 hover:text-blue-500 transition-all text-gray-600 shadow border border-black/10 hover:scale-110"
            title="שכפל לוח"
          >
            <Copy size={16} />
          </button>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/65 via-black/30 to-transparent">
        <h3 className="font-bold text-white text-base truncate" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{board.title}</h3>
        {board.description && (
          <p className="text-white/90 text-xs truncate mt-0.5" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>{board.description}</p>
        )}
        <p className="text-white/75 text-xs mt-0.5">{board.post_count ?? 0} פוסטים</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteBoardTitle, setDeleteBoardTitle] = useState('');
  const [duplicateBoard, setDuplicateBoard] = useState<Board | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const navigate = useNavigate();
  const { token, username } = useAuth();

  const authHeaders = makeAuthHeaders(token);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchBoards = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/boards`, { headers: authHeaders });
      const data = await res.json();
      setBoards(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchBoards(); }, [fetchBoards]);

  useUserNotifications(username, (n) => {
    const notif = n as { type: string };
    if (notif.type === 'shared') fetchBoards();
  });

  const handleCreate = async (data: { title: string; description: string; background: string; layout: string }) => {
    const res = await fetch(`${API}/api/boards`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(data),
    });
    const board = await res.json();
    setShowModal(false);
    navigate(`/board/${board.id}`);
  };

  const handleDelete = (e: React.MouseEvent, board: Board) => {
    e.stopPropagation();
    setDeleteConfirmId(board.id);
    setDeleteBoardTitle(board.title);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    const title = deleteBoardTitle;
    const res = await fetch(`${API}/api/boards/${deleteConfirmId}`, { method: 'DELETE', headers: authHeaders });
    if (res.ok || res.status === 204) {
      setBoards(prev => prev.filter(b => b.id !== deleteConfirmId));
      showToast(`הלוח "${title}" נמחק בהצלחה`);
    }
    setDeleteConfirmId(null);
    setDeleteBoardTitle('');
  };

  const handleDuplicateClick = (e: React.MouseEvent, board: Board) => {
    e.stopPropagation();
    setDuplicateBoard(board);
  };

  const handleDuplicateConfirm = async (opts: DuplicateOpts) => {
    if (!duplicateBoard) return;
    const res = await fetch(`${API}/api/boards/${duplicateBoard.id}/duplicate`, {
      method: 'POST', headers: authHeaders,
      body: JSON.stringify({
        title: opts.title,
        posts_option: opts.posts_option,
        password_option: opts.password_option,
        members_option: opts.members_option,
        custom_password: opts.custom_password,
      }),
    });
    setDuplicateBoard(null);
    if (!res.ok) return;
    const newBoard = await res.json();
    setBoards(prev => [{ ...newBoard, my_role: newBoard.my_role ?? 'owner' }, ...prev]);
  };

  const myBoards = boards.filter(b => b.my_role === 'owner');
  const sharedBoards = boards.filter(b => b.my_role !== 'owner');

  const renderGrid = (items: Board[], showNewCard = false) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {showNewCard && (
        <button
          onClick={() => setShowModal(true)}
          className="h-52 rounded-2xl border-2 border-dashed border-orange-300 flex flex-col items-center justify-center gap-3 text-orange-500 bg-orange-50/60 hover:bg-orange-100/70 hover:border-orange-400 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
            <Plus size={24} />
          </div>
          <span className="text-sm font-semibold">צור לוח חדש</span>
        </button>
      )}
      {items.map(board => (
        <BoardCard
          key={board.id}
          board={board}
          onNavigate={() => navigate(`/board/${board.id}`)}
          onDelete={e => handleDelete(e, board)}
          onDuplicate={e => handleDuplicateClick(e, board)}
        />
      ))}
    </div>
  );

  return (
    <div className="flex-1 overflow-auto bg-gray-50" dir="rtl">
      <div className="bg-gradient-to-l from-orange-400 via-pink-400 to-purple-500 text-white px-8 py-10">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-1">שלום, {username}!</h1>
          <p className="text-white/80 text-sm">הלוחות השיתופיים שלך</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Spinner />
          </div>
        ) : boards.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Plus size={28} className="text-orange-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">אין לך לוחות עדיין</h2>
            <p className="text-gray-400 mb-6">צור את הלוח הראשון שלך!</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-orange-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-600 transition-colors"
            >
              צור לוח חדש
            </button>
          </div>
        ) : (
          <>
            <section>
              <div className="flex items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  הלוחות שלי
                  <span className="bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded-full font-medium">
                    {myBoards.length}
                  </span>
                </h2>
              </div>
              {renderGrid(myBoards, true)}
            </section>

            {sharedBoards.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-bold text-gray-800">משותף איתי</h2>
                  <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full font-medium">
                    {sharedBoards.length}
                  </span>
                </div>
                {renderGrid(sharedBoards)}
              </section>
            )}
          </>
        )}
      </div>

      {showModal && (
        <CreateBoardModal onClose={() => setShowModal(false)} onCreate={handleCreate} />
      )}

      {duplicateBoard && (
        <DuplicateDialog
          board={duplicateBoard}
          onConfirm={handleDuplicateConfirm}
          onClose={() => setDuplicateBoard(null)}
        />
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-red-500" />
            </div>
            <h3 className="font-bold text-gray-800 text-lg mb-2">מחיקת לוח לצמיתות</h3>
            <p className="text-gray-500 text-sm mb-1">
              הלוח <span className="font-semibold text-gray-700">"{deleteBoardTitle}"</span> יימחק לצמיתות.
            </p>
            <p className="text-gray-400 text-sm mb-6">פעולה זו אינה ניתנת לביטול.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
              >
                מחק לצמיתות
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium text-white bg-green-500 transition-all">
          <CheckCircle size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
