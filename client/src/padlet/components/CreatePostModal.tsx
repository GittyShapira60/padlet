import { useState, useRef } from 'react';
import { X, Type, Image, Link, Upload, Loader, BarChart2, Plus, Trash2 } from 'lucide-react';
import { POST_COLORS } from '../types';
import { useAuth } from '../../context/AuthContext';
import { API, makeAuthHeaders } from '../../lib/api';
import EmojiPicker from './EmojiPicker';

type TabType = 'text' | 'image' | 'link' | 'poll';

interface PostData {
  content: string;
  type: string;
  color: string;
  image_url?: string;
  link_url?: string;
  link_title?: string;
  link_description?: string;
  link_image?: string;
  poll_options?: string[];
}

interface Props {
  onClose: () => void;
  onCreate: (data: PostData) => void;
}

export default function CreatePostModal({ onClose, onCreate }: Props) {
  const [tab, setTab] = useState<TabType>('text');
  const [content, setContent] = useState('');
  const [color, setColor] = useState(POST_COLORS[0]);
  const [imageUrl, setImageUrl] = useState('');
  const [imageKey, setImageKey] = useState('');
  const [uploading, setUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDescription, setLinkDescription] = useState('');
  const [linkData, setLinkData] = useState<{ title: string; description: string; image: string } | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const { token } = useAuth();

  const authHeaders = makeAuthHeaders(token);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API}/api/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
      const data = await res.json();
      // data.url is a short-lived signed preview link; data.key is the permanent
      // reference that must be persisted (and re-signed on every future read)
      setImageUrl(data.url);
      setImageKey(data.key);
    } finally {
      setUploading(false);
    }
  };

  const handleFetchLink = async () => {
    if (!linkUrl.trim()) return;
    setLinkLoading(true);
    try {
      const res = await fetch(`${API}/api/link-preview`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ url: linkUrl }),
      });
      const data = await res.json();
      setLinkData({ title: data.title, description: data.description, image: data.image });
      if (data.description && !linkDescription) setLinkDescription(data.description);
    } finally {
      setLinkLoading(false);
    }
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) setPollOptions([...pollOptions, '']);
  };

  const handleRemovePollOption = (i: number) => {
    if (pollOptions.length > 2) setPollOptions(pollOptions.filter((_, idx) => idx !== i));
  };

  const handleSubmit = () => {
    if (tab === 'text') {
      if (!content.trim()) return;
      onCreate({ content: content.trim(), type: 'text', color });
    } else if (tab === 'image') {
      if (!imageKey) return;
      onCreate({ content: content || 'תמונה', type: 'image', color, image_url: imageKey });
    } else if (tab === 'link') {
      if (!linkUrl) return;
      onCreate({
        content: linkData?.title || linkUrl,
        type: 'link',
        color,
        link_url: linkUrl,
        link_title: linkData?.title || '',
        link_description: linkDescription || linkData?.description || '',
        link_image: linkData?.image || '',
      });
    } else if (tab === 'poll') {
      if (!pollQuestion.trim()) return;
      const validOptions = pollOptions.filter(o => o.trim());
      if (validOptions.length < 2) return;
      onCreate({ content: pollQuestion.trim(), type: 'poll', color, poll_options: validOptions });
    }
  };

  const tabs = [
    { id: 'text' as TabType, label: 'טקסט', icon: Type },
    { id: 'image' as TabType, label: 'תמונה', icon: Image },
    { id: 'link' as TabType, label: 'לינק', icon: Link },
    { id: 'poll' as TabType, label: 'סקר', icon: BarChart2 },
  ];

  const canSubmit =
    (tab === 'text' && content.trim()) ||
    (tab === 'image' && imageKey) ||
    (tab === 'link' && linkUrl.trim()) ||
    (tab === 'poll' && pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 text-lg">פוסט חדש</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors border-b-2 ${
                tab === id ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">

          {tab === 'text' && (
            <div className="relative">
              <textarea
                ref={textRef}
                autoFocus
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="מה אתה חושב/ת?"
                rows={5}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-400 resize-none pr-10"
                dir="rtl"
              />
              <div className="absolute top-2 left-2">
                <EmojiPicker onSelect={emoji => {
                  const ta = textRef.current;
                  if (!ta) { setContent(c => c + emoji); return; }
                  const start = ta.selectionStart, end = ta.selectionEnd;
                  const next = content.slice(0, start) + emoji + content.slice(end);
                  setContent(next);
                  setTimeout(() => { ta.focus(); ta.setSelectionRange(start + emoji.length, start + emoji.length); }, 0);
                }} />
              </div>
            </div>
          )}

          {tab === 'image' && (
            <div className="space-y-3">
              <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleFileUpload} />
              {imageUrl ? (
                <div className="relative">
                  <img src={imageUrl} alt="uploaded" className="w-full h-48 object-cover rounded-xl" />
                  <button
                    onClick={() => { setImageUrl(''); setImageKey(''); }}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full h-40 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-orange-400 hover:text-orange-500 transition-all"
                >
                  {uploading ? <Loader size={24} className="animate-spin" /> : <Upload size={24} />}
                  <span className="text-sm">{uploading ? 'מעלה...' : 'לחץ להעלאת תמונה'}</span>
                </button>
              )}
              <input
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="כיתוב (אופציונלי)"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                dir="rtl"
              />
            </div>
          )}

          {tab === 'link' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  {!linkUrl && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none select-none">
                      הדבק כתובת האתר...
                    </span>
                  )}
                  <input
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                    dir="ltr"
                    onKeyDown={e => e.key === 'Enter' && handleFetchLink()}
                  />
                </div>
                <button
                  onClick={handleFetchLink}
                  disabled={!linkUrl.trim() || linkLoading}
                  className="bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
                >
                  {linkLoading ? <Loader size={15} className="animate-spin" /> : 'טען'}
                </button>
              </div>

              <input
                value={linkDescription}
                onChange={e => setLinkDescription(e.target.value)}
                placeholder="תיאור הלינק (אופציונלי)"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                dir="rtl"
              />
              {linkData && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  {linkData.image && (
                    <img src={linkData.image} alt="" className="w-full h-32 object-cover" />
                  )}
                  <div className="p-3">
                    <p className="font-medium text-sm text-gray-800 truncate">{linkData.title}</p>
                    <p className="text-xs text-blue-500 mt-1 truncate">{linkUrl}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'poll' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">שאלה</label>
                <input
                  autoFocus
                  value={pollQuestion}
                  onChange={e => setPollQuestion(e.target.value)}
                  placeholder="מה השאלה שלך?"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600">תשובות ({pollOptions.length}/4)</label>
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </div>
                    <input
                      value={opt}
                      onChange={e => {
                        const next = [...pollOptions];
                        next[i] = e.target.value;
                        setPollOptions(next);
                      }}
                      placeholder={`תשובה ${i + 1}...`}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                      dir="rtl"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePollOption(i)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 4 && (
                  <button
                    type="button"
                    onClick={handleAddPollOption}
                    className="flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-600 transition-colors"
                  >
                    <Plus size={14} />
                    הוסף תשובה
                  </button>
                )}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium">
              {tab === 'text' ? 'צבע רקע:' : 'צבע מסגרת:'}
            </p>
            <div className="flex gap-2 flex-wrap">
              {POST_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                    color === c ? 'border-gray-700 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              ביטול
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              הוסף פוסט
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
