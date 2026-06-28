import { Post, BoardRole } from '../types';
import PostCard from './PostCard';

const ROTATIONS  = [-5, 3, -2, 4, -3, 2, -4, 5, -1, 3];
const TAIL_SIDES = ['bottom-left', 'bottom-right', 'bottom-left', 'top-right', 'bottom-right', 'top-left'] as const;
type TailSide = typeof TAIL_SIDES[number];

function bubbleTail(side: TailSide, color: string): React.CSSProperties {
  const base: React.CSSProperties = { position: 'absolute', width: 0, height: 0 };
  const h = 13, w = 10;
  switch (side) {
    case 'bottom-left':  return { ...base, bottom: -h, left: 22,
      borderLeft: `${w}px solid transparent`, borderRight: `${w}px solid transparent`, borderTop: `${h}px solid ${color}` };
    case 'bottom-right': return { ...base, bottom: -h, right: 22,
      borderLeft: `${w}px solid transparent`, borderRight: `${w}px solid transparent`, borderTop: `${h}px solid ${color}` };
    case 'top-left':     return { ...base, top: -h, left: 22,
      borderLeft: `${w}px solid transparent`, borderRight: `${w}px solid transparent`, borderBottom: `${h}px solid ${color}` };
    case 'top-right':    return { ...base, top: -h, right: 22,
      borderLeft: `${w}px solid transparent`, borderRight: `${w}px solid transparent`, borderBottom: `${h}px solid ${color}` };
  }
}

interface Props {
  posts: Post[];
  boardId: string;
  myRole: BoardRole;
  onUpdate: (id: string, d: Partial<Post>) => void;
  onDelete: (id: string) => void;
  onAddComment: (id: string, c: string) => void;
  onDoubleClick?: () => void;
}

export default function BrainstormLayout({ posts, boardId, myRole, onUpdate, onDelete, onAddComment, onDoubleClick }: Props) {
  return (
    <div className="flex-1 overflow-auto p-10 relative" onDoubleClick={onDoubleClick}>
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full pointer-events-none">
          <div className="bg-white/30 backdrop-blur-sm border border-white/50 rounded-2xl px-7 py-3.5 select-none">
            <p className="text-sm font-medium text-gray-600">לחץ פעמיים כדי להוסיף פוסט</p>
          </div>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-8">
          {posts.map((post, i) => {
            const rotation = ROTATIONS[i % ROTATIONS.length];
            const tailSide = TAIL_SIDES[i % TAIL_SIDES.length];
            const tailIsBottom = tailSide.startsWith('bottom');

            return (
              <div key={post.id}
                className="break-inside-avoid relative hover:z-10 transition-transform"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  marginBottom: tailIsBottom ? 28 : 14,
                  marginTop: tailIsBottom ? 8 : 20,
                }}>
                <div style={{ position: 'relative', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.22))' }}>
                  <div style={{ borderRadius: 28, overflow: 'hidden' }}>
                    <PostCard post={post} boardId={boardId} myRole={myRole}
                      onUpdate={onUpdate} onDelete={onDelete} onAddComment={onAddComment} isGrid={true} />
                  </div>
                  <div style={bubbleTail(tailSide, post.color)} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
