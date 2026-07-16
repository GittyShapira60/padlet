import { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { Post, BoardRole } from '../types';
import PostCard from './PostCard';

const SLOT     = 300;
const CARD_W   = 240;
const CARD_H   = 260;
const LINE_Y   = 340;
const EDGE_PAD = 24;
const GAP      = 8;

const MONTHS = ['ינו','פבר','מרץ','אפר','מאי','יונ','יול','אוג','ספט','אוק','נוב','דצמ'];

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getDate().toString().padStart(2, '0')} ${MONTHS[dt.getMonth()]} ${dt.getFullYear().toString().slice(-2)}`;
}

function fmtTime(d: string) {
  const dt = new Date(d);
  return `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
}

interface Props {
  posts: Post[];
  boardId: string;
  myRole: BoardRole;
  canPost: boolean;
  direction?: 'ltr' | 'rtl';
  onUpdate: (id: string, d: Partial<Post>) => void;
  onDelete: (id: string) => void;
  onAddComment: (id: string, c: string) => void;
  onAddPost: (afterIndex?: number) => void;
}

export default function TimelineLayout({
  posts, boardId, myRole, canPost, direction = 'rtl',
  onUpdate, onDelete, onAddComment, onAddPost,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);
  const isRtl = direction === 'rtl';

  const sorted = [...posts].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const n = sorted.length;
  const contentW = 2 * EDGE_PAD + CARD_W + Math.max(0, n - 1) * SLOT;
  const totalW = Math.max(contentW, containerW || contentW);
  const totalH = LINE_Y + CARD_H + GAP + 80;

  useEffect(() => {
    if (!scrollRef.current) return;
    setContainerW(scrollRef.current.clientWidth);
    const ro = new ResizeObserver(entries => setContainerW(entries[0].contentRect.width));
    ro.observe(scrollRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!isRtl || containerW === 0 || !scrollRef.current) return;
    const el = scrollRef.current;
    el.scrollLeft = el.scrollWidth - el.clientWidth;
  }, [isRtl, containerW]);

  const getCx = (i: number) =>
    isRtl
      ? totalW - EDGE_PAD - CARD_W / 2 - i * SLOT
      : EDGE_PAD + CARD_W / 2 + i * SLOT;

  if (sorted.length === 0) {
    return (
      <div ref={scrollRef} className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
        <div className="flex flex-col items-center justify-center h-full gap-4 text-white/70">
          <p className="text-xl font-semibold">ציר הזמן ריק</p>
          <p className="text-sm text-white/50">פוסטים יסודרו לפי תאריך יצירה</p>
          {canPost && (
            <button onClick={() => onAddPost()}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-2xl text-sm font-medium transition-all border border-white/30 mt-2">
              <Plus size={16} /> הוסף פוסט ראשון
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
      <div style={{ width: totalW, height: totalH, position: 'relative', minHeight: '100%', direction: 'ltr' }}>

        <div style={{
          position: 'absolute', top: LINE_Y, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8) 4%, rgba(255,255,255,0.8) 96%, transparent)',
          borderRadius: 4,
        }} />

        {canPost && n > 0 && (
          <div style={{
            position: 'absolute',
            left: isRtl ? getCx(n - 1) - SLOT / 2 - 14 : getCx(n - 1) + SLOT / 2 - 14,
            top: LINE_Y - 14,
            zIndex: 10,
          }} className="group/endplus">
            <button onClick={() => onAddPost()}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(249,115,22,0.85)', border: '2px solid rgba(255,255,255,0.7)',
                color: '#fff', fontSize: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}>+</button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-black/75 text-white text-[10px] px-2 py-0.5 rounded-md whitespace-nowrap opacity-0 group-hover/endplus:opacity-100 transition-opacity pointer-events-none">
              הוסף פוסט
            </div>
          </div>
        )}

        {sorted.map((post, i) => {
          const cx = getCx(i);
          const above = i % 2 === 0;
          const cardTopPos = above ? LINE_Y - GAP : LINE_Y + GAP;
          const connectorTop = above ? LINE_Y - GAP : LINE_Y + 3;
          const connectorH = GAP - 3;
          const betweenX = isRtl
            ? cx - SLOT / 2 - 12
            : cx + SLOT / 2 - 12;

          return (
            <div key={post.id}>
              <div style={{
                position: 'absolute', left: cx - 1, top: connectorTop,
                width: 2, height: connectorH,
                background: 'rgba(255,255,255,0.5)',
              }} />

              <div style={{
                position: 'absolute',
                left: cx - CARD_W / 2,
                top: cardTopPos,
                transform: above ? 'translateY(-100%)' : undefined,
                width: CARD_W,
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                border: '1.5px solid rgba(255,255,255,0.25)',
                maxHeight: CARD_H,
                overflowY: 'auto',
                direction: 'rtl',
              }}>
                <PostCard post={post} boardId={boardId} myRole={myRole}
                  onUpdate={onUpdate} onDelete={onDelete} onAddComment={onAddComment} isGrid={true} />
              </div>

              <div style={{
                position: 'absolute', left: cx - 9, top: LINE_Y - 9,
                width: 18, height: 18, borderRadius: '50%',
                background: post.color, border: '3px solid rgba(255,255,255,0.9)',
                zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }} />

              <div style={{
                position: 'absolute',
                left: cx - 60,
                top: above ? LINE_Y + 14 : LINE_Y - 44,
                width: 120, textAlign: 'center', zIndex: 5,
              }}>
                <div style={{
                  display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                  background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)',
                  borderRadius: 8, padding: '3px 10px',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.95)', fontSize: 11, fontWeight: 700 }}>{fmtDate(post.created_at)}</span>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>{fmtTime(post.created_at)}</span>
                </div>
              </div>

              {canPost && i < sorted.length - 1 && (
                <div style={{ position: 'absolute', left: betweenX, top: LINE_Y - 12, zIndex: 10 }}
                  className="group/plus">
                  <button onClick={() => onAddPost(i)}
                    style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.25)',
                      border: '2px solid rgba(255,255,255,0.6)',
                      color: '#fff', fontSize: 16,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >+</button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-black/75 text-white text-[10px] px-2 py-0.5 rounded-md whitespace-nowrap opacity-0 group-hover/plus:opacity-100 transition-opacity pointer-events-none">
                    הוסף פוסט כאן
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
