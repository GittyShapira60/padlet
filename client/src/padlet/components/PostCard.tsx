import { useState, useRef } from 'react';
import { Trash2, Edit2, MessageCircle, Check, X, ExternalLink, BarChart2 } from 'lucide-react';
import { Post, POST_COLORS, BoardRole } from '../types';
import { getSocket } from '../hooks/useSocket';
import { useAuth } from '../../context/AuthContext';
import { API, makeAuthHeaders } from '../../lib/api';
import EmojiPicker from './EmojiPicker';
import Avatar from './Avatar';

interface Props {
  post: Post;
  boardId: string;
  myRole: BoardRole;
  onUpdate: (id: string, data: Partial<Post>) => void;
  onDelete: (id: string) => void;
  onAddComment: (postId: string, content: string) => void;
  isGrid?: boolean;
}

function formatEditTime(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(dateStr: string) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'עכשיו';
  if (mins < 60) return `לפני ${mins} ${mins === 1 ? 'דקה' : 'דקות'}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} ${hours === 1 ? 'שעה' : 'שעות'}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `לפני ${days} ${days === 1 ? 'יום' : 'ימים'}`;
  return new Date(dateStr).toLocaleDateString('he-IL', { day: '2-digit', month: 'short' });
}

export default function PostCard({ post, boardId, myRole, onUpdate, onDelete, onAddComment, isGrid = false }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [voting, setVoting] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const { token, username } = useAuth();

  const headers = makeAuthHeaders(token);

  const isOwner = myRole === 'owner';
  const canEditPost = post.author === username || isOwner;
  const canAddContent = myRole === 'owner' || myRole === 'writer';
  const canComment = canAddContent || myRole === 'commenter';
  const canReact = myRole !== 'viewer';

  const handleLike = async () => {
    await fetch(`${API}/api/posts/${post.id}/like`, { method: 'POST', headers });
  };

  const handleReact = async (emoji: string) => {
    await fetch(`${API}/api/posts/${post.id}/react`, {
      method: 'POST', headers,
      body: JSON.stringify({ emoji }),
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isGrid || isEditing || (e.target as HTMLElement).closest('button, textarea, input, a')) return;
    if (!canAddContent) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = cardRef.current!.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const handleMouseMove = (ev: MouseEvent) => {
      const canvas = document.querySelector('.board-canvas') as HTMLElement;
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      const newX = ev.clientX - canvasRect.left - dragOffset.current.x + canvas.scrollLeft;
      const newY = ev.clientY - canvasRect.top - dragOffset.current.y + canvas.scrollTop;
      if (cardRef.current) {
        cardRef.current.style.left = `${newX}px`;
        cardRef.current.style.top = `${newY}px`;
      }
      getSocket().emit('post:move', { postId: post.id, x: newX, y: newY, boardId });
    };
    const handleMouseUp = (ev: MouseEvent) => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      const canvas = document.querySelector('.board-canvas') as HTMLElement;
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      const newX = ev.clientX - canvasRect.left - dragOffset.current.x + canvas.scrollLeft;
      const newY = ev.clientY - canvasRect.top - dragOffset.current.y + canvas.scrollTop;
      onUpdate(post.id, { x: newX, y: newY });
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSaveEdit = () => {
    onUpdate(post.id, { content: editContent });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(post.content);
    setIsEditing(false);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(post.id, commentText.trim());
    setCommentText('');
  };

  const handleVote = async (e: React.MouseEvent, optionId: string) => {
    e.stopPropagation();
    if (voting) return;
    setVoting(true);
    try {
      await fetch(`${API}/api/posts/${post.id}/vote`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ option_id: optionId }),
      });
    } finally {
      setVoting(false);
    }
  };

  const cardStyle: React.CSSProperties = isGrid
    ? { backgroundColor: post.color, width: '100%' }
    : {
        position: 'absolute',
        left: post.x,
        top: post.y,
        width: post.width || 220,
        backgroundColor: post.color,
        cursor: isDragging ? 'grabbing' : (canAddContent ? 'grab' : 'default'),
        zIndex: isDragging ? 1000 : 1,
      };

  const totalVotes = post.poll_options?.reduce((sum, o) => sum + o.votes, 0) ?? 0;
  const likedBy = post.liked_by ?? [];

  return (
    <div
      ref={cardRef}
      dir="rtl"
      className={`post-card post-card-shadow rounded-xl flex flex-col transition-shadow ${isEditing ? 'overflow-visible' : 'overflow-hidden'}`}
      style={cardStyle}
      onMouseDown={handleMouseDown}
    >
      {(post.type === 'image' || post.type === 'link' || post.type === 'poll') && (
        <div style={{ height: 4, background: post.color, flexShrink: 0 }} />
      )}

      {post.type === 'image' && post.image_url && (
        <img src={post.image_url} alt={post.content} className="w-full object-cover max-h-56" />
      )}

      {post.type === 'link' && (
        <a href={post.link_url} target="_blank" rel="noopener noreferrer"
          className="block hover:opacity-90 transition-opacity"
          onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
          {post.link_image && <img src={post.link_image} alt={post.link_title} className="w-full h-32 object-cover" />}
          <div className="p-3 bg-gray-50 border-b border-gray-100">
            <p className="font-semibold text-sm text-gray-800 truncate">{post.link_title || post.content}</p>
            {post.link_description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{post.link_description}</p>}
            <div className="flex items-center gap-1 mt-1">
              <ExternalLink size={10} className="text-blue-400" />
              <p className="text-xs text-blue-400 truncate">{post.link_url}</p>
            </div>
          </div>
        </a>
      )}

      <div className="p-3 flex flex-col gap-2 flex-1">
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <div className="relative">
              <textarea ref={editRef} value={editContent} onChange={e => setEditContent(e.target.value)}
                className="text-sm bg-white/60 rounded px-2 py-1 border border-black/10 outline-none resize-none min-h-[60px] w-full pr-8"
                autoFocus onClick={e => e.stopPropagation()} dir="rtl" />
              <div className="absolute top-1 left-1">
                <EmojiPicker onSelect={emoji => {
                  const ta = editRef.current;
                  if (!ta) { setEditContent(c => c + emoji); return; }
                  const s = ta.selectionStart, e2 = ta.selectionEnd;
                  const next = editContent.slice(0, s) + emoji + editContent.slice(e2);
                  setEditContent(next);
                  setTimeout(() => { ta.focus(); ta.setSelectionRange(s + emoji.length, s + emoji.length); }, 0);
                }} />
              </div>
            </div>
            <div className="flex gap-1 justify-end">
              <button onClick={handleCancelEdit} className="p-1.5 rounded hover:bg-black/10 transition-colors text-red-600"><X size={14} /></button>
              <button onClick={handleSaveEdit} className="p-1.5 rounded hover:bg-black/10 transition-colors text-green-700"><Check size={14} /></button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-1 min-w-0">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-black/60 truncate block">{post.author}</span>
                <span className="text-xs text-black/35 truncate block">{timeAgo(post.created_at)}</span>
                {post.edited_by && (
                  <span className="text-xs text-black/30 truncate block">
                    נערך · {formatEditTime(post.updated_at)}
                  </span>
                )}
              </div>
              <Avatar username={post.author} size="sm" />
            </div>

            {post.type !== 'link' && post.type !== 'poll' && (
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed flex-1 min-h-[30px]">
                {post.content}
              </p>
            )}

            {post.type === 'poll' && (
              <div className="space-y-2" onMouseDown={e => e.stopPropagation()}>
                <div className="flex items-center gap-1.5 mb-1">
                  <BarChart2 size={13} className="text-orange-500" />
                  <p className="text-sm font-semibold text-gray-800">{post.content}</p>
                </div>
                {(post.poll_options || []).map(opt => {
                  const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                  return (
                    <button key={opt.id} type="button" onClick={e => handleVote(e, opt.id)} disabled={voting}
                      className={`w-full text-right rounded-lg overflow-hidden border-2 transition-all ${opt.voted_by_me ? 'border-orange-400' : 'border-gray-200 hover:border-orange-300'}`}>
                      <div className="relative px-3 py-1.5">
                        <div className={`absolute inset-0 transition-all ${opt.voted_by_me ? 'bg-orange-100' : 'bg-gray-100'}`} style={{ width: `${pct}%` }} />
                        <div className="relative flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-700">{opt.option_text}</span>
                          <span className="text-xs font-bold text-gray-500 whitespace-nowrap">{opt.votes} · {pct}%</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
                <p className="text-xs text-gray-400 text-left">{totalVotes} הצבעות</p>
              </div>
            )}

            {canEditPost && (
              <div className="flex gap-1 flex-wrap" onMouseDown={e => e.stopPropagation()}>
                {POST_COLORS.map(c => (
                  <button key={c}
                    onClick={e => { e.stopPropagation(); onUpdate(post.id, { color: c }); }}
                    className={`w-4 h-4 rounded-full border transition-transform hover:scale-110 ${post.color === c ? 'border-gray-600 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-black/10">
              <div className="flex gap-1 items-center flex-wrap">

                {(post.reactions || []).filter(r => r.count > 0).map(r => (
                  <button key={r.emoji}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); if (canReact) handleReact(r.emoji); }}
                    className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full border transition-all ${
                      r.reacted_by_me
                        ? 'bg-orange-100 border-orange-300 text-orange-700'
                        : 'bg-black/5 border-black/10 text-gray-600 hover:border-orange-300'
                    }`}>
                    <span>{r.emoji}</span>
                    <span>{r.count}</span>
                  </button>
                ))}

                {canReact && (
                  <div onMouseDown={e => e.stopPropagation()}>
                    <EmojiPicker onSelect={emoji => handleReact(emoji)} />
                  </div>
                )}

                {canComment && (
                  <button onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); setShowComments(!showComments); }}
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-500 transition-colors px-1.5 py-0.5 rounded hover:bg-black/10">
                    <MessageCircle size={12} />
                    {(post.comments?.length ?? 0) > 0 && <span>{post.comments.length}</span>}
                  </button>
                )}
              </div>
              <div className="flex gap-1">
                {canEditPost && post.type !== 'poll' && (
                  <button onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); setIsEditing(true); }}
                    className="p-1 text-gray-500 hover:text-blue-600 hover:bg-black/10 rounded transition-colors">
                    <Edit2 size={12} />
                  </button>
                )}
                {canEditPost && (
                  <button onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); onDelete(post.id); }}
                    className="p-1 text-gray-500 hover:text-red-600 hover:bg-black/10 rounded transition-colors">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {showComments && !isEditing && (
          <div className="border-t border-black/10 pt-2 space-y-1" onMouseDown={e => e.stopPropagation()}>
            {(post.comments ?? []).map(c => (
              <div key={c.id} className="bg-white/50 rounded px-2 py-1 text-xs">
                <span className="font-bold text-gray-700">{c.author}: </span>
                <span className="text-gray-600">{c.content}</span>
              </div>
            ))}
            {canComment && (
              <form onSubmit={handleAddComment} className="flex gap-1 mt-1">
                <input value={commentText} onChange={e => setCommentText(e.target.value)}
                  placeholder="הוסף תגובה..." dir="rtl"
                  className="flex-1 text-xs bg-white/60 border border-black/10 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-orange-400" />
                <button type="submit" className="text-xs bg-orange-400 text-white rounded px-2 py-1 hover:bg-orange-500 transition-colors">
                  שלח
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
