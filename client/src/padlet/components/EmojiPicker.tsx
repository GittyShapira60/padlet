import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Smile } from 'lucide-react';
import data from '@emoji-mart/data';
import { Picker as EmojiMartPicker } from 'emoji-mart';

const Picker = EmojiMartPicker as unknown as React.ComponentType<{
  data: unknown;
  onEmojiSelect: (emoji: { native: string }) => void;
  theme?: string;
  previewPosition?: string;
  skinTonePosition?: string;
}>;

interface Props {
  onSelect: (emoji: string) => void;
  className?: string;
}

export default function EmojiPicker({ onSelect, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLDivElement>(null);

  const computePopupStyle = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const popupW = 352;
    const popupH = 435;
    let left = rect.left;
    if (left + popupW > window.innerWidth - 8) left = window.innerWidth - popupW - 8;
    if (left < 8) left = 8;
    const openAbove = rect.top - popupH - 8 > 0;
    const top = openAbove ? rect.top - popupH - 8 : rect.bottom + 8;
    setPopupStyle({ position: 'fixed', top, left, zIndex: 99999 });
  };

  const handleToggle = () => {
    if (!open) computePopupStyle();
    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (emoji: { native: string }) => {
    onSelect(emoji.native);
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={btnRef}>
      <button
        type="button"
        onMouseDown={e => e.stopPropagation()}
        onClick={handleToggle}
        className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
        title="הוסף אימוג'י"
      >
        <Smile size={16} />
      </button>

      {open && createPortal(
        <div style={popupStyle} onMouseDown={e => e.stopPropagation()}>
          <Picker
            data={data}
            onEmojiSelect={handleSelect}
            theme="light"
            previewPosition="none"
            skinTonePosition="none"
          />
        </div>,
        document.body
      )}
    </div>
  );
}
