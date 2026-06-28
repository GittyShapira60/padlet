import { useState } from 'react';
import { X } from 'lucide-react';
import { BOARD_BACKGROUNDS, getBoardBgStyle } from '../types';
import { BoardBasicFields, BackgroundPicker, LayoutPicker } from './BoardFormFields';

interface Props {
  onClose: () => void;
  onCreate: (data: { title: string; description: string; background: string; layout: string }) => void;
}

const LAST_BG_KEY = 'padlet_last_background'

export default function CreateBoardModal({ onClose, onCreate }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [background, setBackground] = useState(() => {
    return localStorage.getItem(LAST_BG_KEY) ?? BOARD_BACKGROUNDS[0].value
  });
  const [layout, setLayout] = useState<string>('wall');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    localStorage.setItem(LAST_BG_KEY, background);
    onCreate({ title: title.trim(), description: description.trim(), background, layout });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>

        <div className="h-28 relative transition-all duration-300" style={getBoardBgStyle(background)}>
          <div className="absolute inset-0 bg-black/20 flex items-end p-4">
            <p className="text-white font-bold text-lg drop-shadow truncate">{title || 'שם הלוח...'}</p>
          </div>
          <button onClick={onClose} className="absolute top-3 left-3 bg-white/20 backdrop-blur-sm text-white rounded-lg p-1.5 hover:bg-white/40 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <BoardBasicFields
            title={title} onTitleChange={setTitle}
            description={description} onDescriptionChange={setDescription}
            autoFocusTitle
          />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">רקע</label>
            <BackgroundPicker background={background} onChange={setBackground} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">סוג לוח</label>
            <LayoutPicker layout={layout} onChange={setLayout} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium">
              ביטול
            </button>
            <button onClick={handleSubmit} disabled={!title.trim()}
              className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md">
              צור לוח
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
