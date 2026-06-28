import { useState, useRef, useEffect } from 'react';
import { X, Lock, UserPlus, Eye, EyeOff, Trash2, MessageSquare, PenLine,
  CheckCircle, AlertCircle, Loader2, Globe, GlobeLock,
  Folder, User, Users2, Key, Unlock, UserX } from 'lucide-react';
import { Board, BoardMember, canAdmin } from '../types';
import { useAuth } from '../../context/AuthContext';
import { makeAuthHeaders } from '../../lib/api';
import { BoardBasicFields, BackgroundPicker, LayoutPicker } from './BoardFormFields';

interface Props {
  board: Board;
  onClose: () => void;
  onUpdate: (data: Partial<Board>) => void;
  onUpdateMembers?: (members: BoardMember[]) => void;
}

const ROLES = [
  { value: 'writer',    label: 'כותב',  icon: <PenLine size={13} />,      desc: 'יכול להוסיף ולערוך פוסטים' },
  { value: 'commenter', label: 'מגיב',  icon: <MessageSquare size={13} />, desc: 'יכול לכתוב תגובות על פוסטים בלבד' },
  { value: 'viewer',    label: 'צופה',  icon: <Eye size={13} />,           desc: 'קריאה בלבד, ללא יכולת כתיבה' },
] as const;

type RoleVal = 'viewer' | 'commenter' | 'writer';
type PostsOption = 'none' | 'mine' | 'all';
type PasswordDupOption = 'keep' | 'new' | 'none';
type MembersDupOption = 'keep' | 'none';

export interface DuplicateOpts {
  title: string;
  posts_option: PostsOption;
  password_option: PasswordDupOption;
  members_option: MembersDupOption;
  custom_password?: string;
}

const POSTS_OPTIONS: { value: PostsOption; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'none', label: 'ללא פוסטים',    desc: 'הלוח ישוכפל ריק',              icon: <Folder size={15} /> },
  { value: 'mine', label: 'רק פוסטים שלי', desc: 'רק פוסטים שהוספתי',           icon: <User size={15} /> },
  { value: 'all',  label: 'כל הפוסטים',    desc: 'כולל פוסטים של כל המשתמשים', icon: <Users2 size={15} /> },
];

const PASSWORD_DUP_OPTIONS: { value: PasswordDupOption; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'keep', label: 'שמור סיסמה קיימת', desc: 'הסיסמה תועתק ללוח החדש',  icon: <Lock size={15} /> },
  { value: 'new',  label: 'צור סיסמה חדשה',   desc: 'הכנס סיסמה ללוח המשוכפל', icon: <Key size={15} /> },
  { value: 'none', label: 'ללא סיסמה',         desc: 'הלוח החדש יהיה פתוח',      icon: <Unlock size={15} /> },
];

const MEMBERS_DUP_OPTIONS: { value: MembersDupOption; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'keep', label: 'שמור משתמשים משותפים', desc: 'כל המשתמשים יועתקו ללוח החדש', icon: <Users2 size={15} /> },
  { value: 'none', label: 'התחל על נקי',            desc: 'הלוח החדש לא ישתף אף אחד',     icon: <UserX size={15} /> },
];

function OptionRow<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string; desc: string; icon: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      {options.map(opt => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-right ${
            value === opt.value ? 'border-orange-400 bg-orange-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
          }`}>
          <span className={`flex-shrink-0 ${value === opt.value ? 'text-orange-500' : 'text-gray-400'}`}>{opt.icon}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${value === opt.value ? 'text-orange-700' : 'text-gray-700'}`}>{opt.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

export function DuplicateDialog({ board, onConfirm, onClose }: {
  board: Board;
  onConfirm: (opts: DuplicateOpts) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(`עותק של ${board.title}`);
  const [postsOption, setPostsOption] = useState<PostsOption>('all');
  const [passwordOption, setPasswordOption] = useState<PasswordDupOption>(board.password ? 'keep' : 'none');
  const [membersOption, setMembersOption] = useState<MembersDupOption>('none');
  const [customPassword, setCustomPassword] = useState('');

  const hasPassword = !!board.password;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-800 text-base">שכפל לוח</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">שם הלוח החדש</label>
            <input value={title} onChange={e => setTitle(e.target.value)} autoFocus dir="rtl"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">אילו פוסטים לכלול?</label>
            <OptionRow options={POSTS_OPTIONS} value={postsOption} onChange={setPostsOption} />
          </div>

          {hasPassword && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">סיסמה ללוח המשוכפל</label>
              <OptionRow options={PASSWORD_DUP_OPTIONS} value={passwordOption} onChange={(v) => { setPasswordOption(v); if (v !== 'new') setCustomPassword(''); }} />
              {passwordOption === 'new' && (
                <input
                  type="text"
                  value={customPassword}
                  onChange={e => setCustomPassword(e.target.value)}
                  placeholder="הכנס סיסמה חדשה..."
                  dir="rtl"
                  className="mt-2 w-full border border-orange-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/50"
                />
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">משתמשים משותפים</label>
            <OptionRow options={MEMBERS_DUP_OPTIONS} value={membersOption} onChange={setMembersOption} />
          </div>
        </div>

        <div className="flex gap-3 px-5 pb-5 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">ביטול</button>
          <button disabled={!title.trim() || (passwordOption === 'new' && !customPassword.trim())}
            onClick={() => { onConfirm({ title: title.trim(), posts_option: postsOption, password_option: passwordOption, members_option: membersOption, custom_password: customPassword.trim() || undefined }); onClose(); }}
            className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors">
            שכפל לוח
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BoardSettingsModal({ board, onClose, onUpdate, onUpdateMembers }: Props) {
  const { token } = useAuth();
  const [title, setTitle] = useState(board.title);
  const [description, setDescription] = useState(board.description);
  const [background, setBackground] = useState(board.background);
  const [layout, setLayout] = useState(board.layout);
  const [password, setPassword] = useState(board.password || '');
  const [isPublic, setIsPublic] = useState(board.isPublic ?? false);
  const [showPassword, setShowPassword] = useState(false);
  const [members, setMembers] = useState<BoardMember[]>(
    (board.members || []).filter(m => m.username !== board.owner)
  );

  useEffect(() => {
    fetch(`/api/boards/${board.id}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(list => {
        if (Array.isArray(list)) {
          setMembers(list.filter((m: BoardMember) => m.username !== board.owner));
        }
      })
      .catch(() => {});
  }, [board.id, board.owner, token]);
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState<RoleVal>('writer');
  const [tab, setTab] = useState<'general' | 'sharing'>('general');
  const [copied, setCopied] = useState(false);
  const [savingMembers, setSavingMembers] = useState(false);
  const [savedMembers, setSavedMembers] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [userStatus, setUserStatus] = useState<'idle' | 'checking' | 'found' | 'notfound'>('idle');
  const [resolvedUsername, setResolvedUsername] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAdmin = canAdmin(board.my_role);

  const authHeaders = makeAuthHeaders(token);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (userStatus === 'found' && resolvedUsername && !members.find(m => m.username === resolvedUsername)) {
      const withNew = [...members, { username: resolvedUsername, role: newRole }];
      setMembers(withNew);
      setNewUsername('');
      setUserStatus('idle');
      setResolvedUsername('');
      await saveMembers(withNew);
    }
    onUpdate({ title: title.trim(), description: description.trim(), background, layout, password, isPublic });
  };

  const handleUsernameChange = (val: string) => {
    setNewUsername(val);
    setUserStatus('idle');
    setResolvedUsername('');
    setSuggestions([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setShowSuggestions(false); return; }

    debounceRef.current = setTimeout(async () => {
      setUserStatus('checking');
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(val.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const list: string[] = await res.json();
        const filtered = list.filter(u => u !== board.owner && !members.find(m => m.username === u));
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
        const exact = list.find(u => u.toLowerCase() === val.trim().toLowerCase());
        if (exact) { setUserStatus('found'); setResolvedUsername(exact); }
        else if (list.length === 0) setUserStatus('notfound');
        else setUserStatus('idle');
      } catch {
        setUserStatus('idle');
      }
    }, 300);
  };

  const selectSuggestion = (u: string) => {
    setNewUsername(u); setResolvedUsername(u); setUserStatus('found');
    setSuggestions([]); setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const saveMembers = async (updated: BoardMember[]) => {
    setSavingMembers(true); setSavedMembers(false); setSaveError(false);
    try {
      await onUpdateMembers?.(updated);
      setSavedMembers(true);
      setTimeout(() => setSavedMembers(false), 2500);
    } catch {
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3000);
    } finally {
      setSavingMembers(false);
    }
  };

  const handleAddMember = async () => {
    if (userStatus !== 'found' || !resolvedUsername) return;
    if (members.find(m => m.username === resolvedUsername)) return;
    const updated = [...members, { username: resolvedUsername, role: newRole }];
    setMembers(updated); setNewUsername(''); setUserStatus('idle'); setResolvedUsername(''); setSuggestions([]);
    await saveMembers(updated);
  };

  const handleRemoveMember = async (username: string) => {
    const updated = members.filter(m => m.username !== username);
    setMembers(updated);
    await saveMembers(updated);
  };

  const handleRoleChange = async (username: string, role: RoleVal) => {
    const updated = members.map(m => m.username === username ? { ...m, role } : m);
    setMembers(updated);
    await saveMembers(updated);
  };

  const shareUrl = `${window.location.origin}/board/${board.id}`;
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-800">הגדרות לוח</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
        </div>

        <div className="flex border-b border-gray-100 flex-shrink-0">
          {(['general', 'sharing'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t === 'general' ? 'כללי' : 'שיתוף וגישה'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 p-5 space-y-4">

            {tab === 'general' && (
              <>
                <BoardBasicFields
                  title={title} onTitleChange={setTitle}
                  description={description} onDescriptionChange={setDescription}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">רקע</label>
                  <BackgroundPicker background={background} onChange={setBackground} showPreview />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">סוג לוח</label>
                  <LayoutPicker layout={layout} onChange={val => setLayout(val as Board['layout'])} />
                </div>
              </>
            )}

            {tab === 'sharing' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">קישור שיתוף</label>
                  <div className="flex gap-2">
                    <input readOnly value={shareUrl}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 bg-gray-50" dir="ltr" />
                    <button type="button" onClick={handleCopyLink}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                      {copied ? 'הועתק!' : 'העתק'}
                    </button>
                  </div>
                </div>

                {isAdmin && (
                  <div className={`flex items-center justify-between p-3 rounded-xl border-2 transition-colors ${isPublic ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center gap-2.5">
                      {isPublic ? <Globe size={16} className="text-green-600 flex-shrink-0" /> : <GlobeLock size={16} className="text-gray-400 flex-shrink-0" />}
                      <div>
                        <p className={`text-sm font-medium ${isPublic ? 'text-green-700' : 'text-gray-700'}`}>
                          {isPublic ? 'הלוח פתוח לכל בעלי הקישור' : 'גישה לפי הזמנה בלבד'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {isPublic ? 'כל מי שיש לו את הקישור יוכל לצפות בלוח' : 'רק מי שהוזמן יכול לגשת ללוח'}
                        </p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setIsPublic(v => !v)}
                      className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${isPublic ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPublic ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                )}

                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                      <Lock size={13} /> סיסמה להגנה (אופציונלי)
                    </label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} value={password}
                        onChange={e => setPassword(e.target.value)} placeholder="השאר ריק = ללא סיסמה"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 pr-10" dir="rtl" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {password && <p className="text-xs text-amber-600 mt-1">הלוח יהיה מוגן בסיסמה</p>}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">משתמשים משותפים</label>
                    {savingMembers && <span className="flex items-center gap-1 text-xs text-gray-400"><Loader2 size={11} className="animate-spin" /> שומר...</span>}
                    {savedMembers && !savingMembers && <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle size={11} /> נשמר!</span>}
                  </div>

                  <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg mb-2">
                    <PenLine size={14} className="text-orange-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-800 flex-1">{board.owner}</span>
                    <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full">בעלים</span>
                  </div>

                  {members.map(m => (
                    <div key={m.username} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg mb-1.5">
                      {m.role === 'commenter'
                        ? <MessageSquare size={14} className="text-blue-400 flex-shrink-0" />
                        : m.role === 'viewer'
                          ? <Eye size={14} className="text-gray-400 flex-shrink-0" />
                          : <PenLine size={14} className="text-green-500 flex-shrink-0" />
                      }
                      <span className="text-sm text-gray-800 flex-1">{m.username}</span>
                      {isAdmin ? (
                        <select value={m.role === 'viewer' ? 'viewer' : m.role === 'commenter' ? 'commenter' : 'writer'}
                          onChange={e => handleRoleChange(m.username, e.target.value as RoleVal)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-orange-400">
                          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-500">{ROLES.find(r => r.value === m.role)?.label || m.role}</span>
                      )}
                      {isAdmin && (
                        <button type="button" onClick={() => handleRemoveMember(m.username)}
                          className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}

                  {isAdmin && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            ref={inputRef}
                            value={newUsername}
                            onChange={e => handleUsernameChange(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { e.preventDefault(); handleAddMember(); }
                              if (e.key === 'Escape') setShowSuggestions(false);
                            }}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                            placeholder="חיפוש משתמש..."
                            className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 pr-8 ${
                              userStatus === 'notfound' ? 'border-red-400' :
                              userStatus === 'found'    ? 'border-green-400' : 'border-gray-200'
                            }`}
                            dir="rtl"
                          />
                          <span className="absolute left-2 top-1/2 -translate-y-1/2">
                            {userStatus === 'checking' && <Loader2 size={14} className="text-gray-400 animate-spin" />}
                            {userStatus === 'found'    && <CheckCircle size={14} className="text-green-500" />}
                            {userStatus === 'notfound' && <AlertCircle size={14} className="text-red-400" />}
                          </span>
                          {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                              {suggestions.map(u => (
                                <button key={u} type="button"
                                  onMouseDown={() => selectSuggestion(u)}
                                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-orange-50 text-sm text-right transition-colors">
                                  <PenLine size={13} className="text-gray-400 flex-shrink-0" />
                                  <span className="flex-1">{u}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button type="button" onClick={handleAddMember}
                          disabled={userStatus !== 'found'}
                          className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                          <UserPlus size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        {ROLES.map(r => (
                          <button key={r.value} type="button" onClick={() => setNewRole(r.value)}
                            className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border-2 transition-all text-center ${
                              newRole === r.value ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                            }`}>
                            <span className={`text-xs font-medium ${newRole === r.value ? 'text-orange-600' : 'text-gray-600'}`}>{r.label}</span>
                            <span className="text-[10px] text-gray-400 leading-tight">{r.desc}</span>
                          </button>
                        ))}
                      </div>

                      {userStatus === 'notfound' && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle size={12} /> משתמש לא נמצא במערכת
                        </p>
                      )}
                    </div>
                  )}
                </div>

              </>
            )}
          </div>

          {isAdmin ? (
            <div className="p-5 border-t border-gray-100 flex-shrink-0 space-y-2">
              {saveError && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle size={13} /> לא הצלחנו להוסיף את המשתמש. בדקי שם משתמש ונסי שנית.
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">ביטול</button>
                <button type="submit" className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">שמור שינויים</button>
              </div>
            </div>
          ) : (
            <div className="p-5 border-t border-gray-100 flex-shrink-0">
              <button type="button" onClick={onClose} className="w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">סגור</button>
            </div>
          )}
        </form>
      </div>
    </div>

    </>
  );
}
