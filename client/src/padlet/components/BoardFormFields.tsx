import { useState } from 'react';
import { StickyNote, LayoutGrid as LayoutGridIcon, Lightbulb, CalendarDays } from 'lucide-react';
import {
  BOARD_BACKGROUNDS, BOARD_WALLPAPERS, BOARD_PHOTO_BACKGROUNDS,
  LAYOUT_OPTIONS, getBoardBgStyle,
} from '../types';

const LAYOUT_ICONS: Record<string, React.ReactNode> = {
  wall:       <StickyNote size={14} />,
  grid:       <LayoutGridIcon size={14} />,
  brainstorm: <Lightbulb size={14} />,
  timeline:   <CalendarDays size={14} />,
};


export function BoardBasicFields({
  title, onTitleChange,
  description, onDescriptionChange,
  autoFocusTitle = false,
}: {
  title: string;
  onTitleChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  autoFocusTitle?: boolean;
}) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">שם הלוח</label>
        <input
          autoFocus={autoFocusTitle}
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder="לוח הרעיונות שלי..."
          dir="rtl"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">תיאור</label>
        <textarea
          value={description}
          onChange={e => onDescriptionChange(e.target.value)}
          placeholder="תאר את מטרת הלוח..."
          dir="rtl"
          rows={2}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
        />
      </div>
    </>
  );
}


export const LAYOUT_PREVIEWS: Record<string, React.ReactNode> = {
  wall: (
    <svg viewBox="0 0 72 46" className="w-full h-full">
      <rect x="4"  y="6"  width="28" height="16" rx="3" fill="#fef08a" opacity="0.9"/>
      <rect x="40" y="4"  width="26" height="13" rx="3" fill="#bbf7d0" opacity="0.9"/>
      <rect x="10" y="27" width="24" height="14" rx="3" fill="#fbcfe8" opacity="0.9"/>
      <rect x="42" y="22" width="26" height="18" rx="3" fill="#bfdbfe" opacity="0.9"/>
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 72 46" className="w-full h-full">
      <rect x="3"  y="4"  width="20" height="14" rx="2" fill="#fef08a" opacity="0.9"/>
      <rect x="26" y="4"  width="20" height="14" rx="2" fill="#bbf7d0" opacity="0.9"/>
      <rect x="49" y="4"  width="20" height="14" rx="2" fill="#fbcfe8" opacity="0.9"/>
      <rect x="3"  y="22" width="20" height="14" rx="2" fill="#bfdbfe" opacity="0.9"/>
      <rect x="26" y="22" width="20" height="14" rx="2" fill="#ddd6fe" opacity="0.9"/>
      <rect x="49" y="22" width="20" height="14" rx="2" fill="#fed7aa" opacity="0.9"/>
    </svg>
  ),
  brainstorm: (
    <svg viewBox="0 0 72 46" className="w-full h-full">
      <g transform="rotate(-6 26 16)"><rect x="4"  y="5"  width="44" height="20" rx="3" fill="#fef08a" opacity="0.9"/></g>
      <g transform="rotate(5 50 12)"><rect x="36" y="4"  width="32" height="14" rx="3" fill="#bbf7d0" opacity="0.9"/></g>
      <g transform="rotate(-3 28 36)"><rect x="8"  y="28" width="36" height="14" rx="3" fill="#fbcfe8" opacity="0.9"/></g>
    </svg>
  ),
  timeline: (
    <svg viewBox="0 0 72 46" className="w-full h-full">
      <line x1="4" y1="34" x2="68" y2="34" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5,3"/>
      <circle cx="16" cy="34" r="3" fill="#f97316"/>
      <circle cx="36" cy="34" r="3" fill="#f97316"/>
      <circle cx="56" cy="34" r="3" fill="#f97316"/>
      <rect x="4"  y="10" width="24" height="18" rx="3" fill="#fef08a" opacity="0.95"/>
      <polygon points="16,28 13,34 19,34" fill="#fef08a" opacity="0.95"/>
      <rect x="24" y="8"  width="24" height="18" rx="3" fill="#bbf7d0" opacity="0.95"/>
      <polygon points="36,26 33,34 39,34" fill="#bbf7d0" opacity="0.95"/>
      <rect x="44" y="10" width="24" height="18" rx="3" fill="#bfdbfe" opacity="0.95"/>
      <polygon points="56,28 53,34 59,34" fill="#bfdbfe" opacity="0.95"/>
    </svg>
  ),
};

export function BgButton({ isSelected, onClick, style, title }: {
  isSelected: boolean; onClick: () => void; style: React.CSSProperties; title: string;
}) {
  return (
    <div className="relative group flex-shrink-0">
      <button type="button" onClick={onClick}
        className={`w-10 h-10 rounded-xl border-2 transition-all block ${
          isSelected ? 'border-orange-500 scale-110 shadow-md' : 'border-gray-200 hover:border-gray-400 hover:scale-105'
        }`}
        style={style}
      />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900/90 text-white text-[10px] font-medium px-2 py-0.5 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
        {title}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/90" />
      </div>
    </div>
  );
}


const BG_TABS = [
  { id: 'gradient'  as const, label: 'צבעוניים' },
  { id: 'photo'     as const, label: 'תמונות'   },
  { id: 'wallpaper' as const, label: 'טפטים'    },
];

function tabForBackground(bg: string): 'gradient' | 'photo' | 'wallpaper' {
  if (BOARD_PHOTO_BACKGROUNDS.some(b => b.value === bg)) return 'photo'
  if (BOARD_WALLPAPERS.some(b => b.value === bg)) return 'wallpaper'
  return 'gradient'
}

export function BackgroundPicker({ background, onChange, showPreview = false }: {
  background: string;
  onChange: (value: string) => void;
  showPreview?: boolean;
}) {
  const [bgTab, setBgTab] = useState<'gradient' | 'photo' | 'wallpaper'>(() => tabForBackground(background));

  return (
    <div>
      <div className="flex gap-1 mb-3 bg-gray-100 p-1 rounded-lg">
        {BG_TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setBgTab(t.id)}
            className={`flex-1 py-1 text-xs rounded-md font-medium transition-colors ${
              bgTab === t.id ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {bgTab === 'gradient' && BOARD_BACKGROUNDS.map(bg => (
          <BgButton key={bg.value} isSelected={background === bg.value}
            onClick={() => onChange(bg.value)} title={bg.label}
            style={{ background: bg.value }} />
        ))}
        {bgTab === 'photo' && BOARD_PHOTO_BACKGROUNDS.map(bg => (
          <BgButton key={bg.value} isSelected={background === bg.value}
            onClick={() => onChange(bg.value)} title={bg.label}
            style={{ background: bg.value }} />
        ))}
        {bgTab === 'wallpaper' && BOARD_WALLPAPERS.map(wp => (
          <BgButton key={wp.value} isSelected={background === wp.value}
            onClick={() => onChange(wp.value)} title={wp.label}
            style={{ backgroundColor: wp.bg, backgroundImage: wp.value, backgroundSize: wp.size }} />
        ))}
      </div>

      {showPreview && (
        <div className="mt-2 rounded-lg overflow-hidden h-8 border border-gray-200"
          style={getBoardBgStyle(background)} />
      )}
    </div>
  );
}

export function LayoutPicker({ layout, onChange }: {
  layout: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-1.5">
      {LAYOUT_OPTIONS.map(opt => (
        <button key={opt.id} type="button" onClick={() => onChange(opt.id)}
          className={`flex items-center gap-3 px-3 py-2 rounded-xl border-2 text-sm transition-all ${
            layout === opt.id
              ? 'border-orange-500 bg-orange-50 text-orange-700'
              : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
          }`}>
          <div className="flex-1 text-right">
            <div className="flex flex-col gap-0.5">
              <div className="font-medium flex gap-1.5 items-center">
                <span>{LAYOUT_ICONS[opt.id]}</span>
                <span>{opt.label}</span>
              </div>
              <div className="text-xs text-gray-400">{opt.description}</div>
            </div>
          </div>
          <div className={`w-14 h-9 rounded-lg flex-shrink-0 overflow-hidden border ${
            layout === opt.id ? 'border-orange-300 bg-orange-100/50' : 'border-gray-200 bg-gray-100'
          }`}>
            {LAYOUT_PREVIEWS[opt.id]}
          </div>
        </button>
      ))}
    </div>
  );
}
