import type { CSSProperties } from 'react';

export type BoardRole = 'owner' | 'writer' | 'commenter' | 'viewer';

export interface Comment {
  id: string;
  post_id: string;
  content: string;
  author: string;
  created_at: string;
}

export interface PollOption {
  id: string;
  post_id: string;
  option_text: string;
  sort_order: number;
  votes: number;
  voted_by_me: boolean;
}

export interface Post {
  id: string;
  board_id: string;
  type: 'text' | 'image' | 'link' | 'poll';
  content: string;
  author: string;
  color: string;
  x: number;
  y: number;
  width: number;
  likes: number;
  image_url: string;
  link_url: string;
  link_title: string;
  link_description: string;
  link_image: string;
  edited_by: string;
  shape?: string;
  updated_at: string;
  created_at: string;
  comments: Comment[];
  poll_options: PollOption[];
  my_vote: string | null;
  liked_by_me?: boolean;
  liked_by?: string[];
  reactions?: { emoji: string; count: number; reacted_by_me: boolean }[];
}

export interface BoardMember {
  username: string;
  role: 'writer' | 'commenter' | 'viewer';
}

export interface Notification {
  id: string;
  username: string;
  type: string;
  message: string;
  board_id: string;
  board_title: string;
  read: number;
  created_at: string;
}

export interface Board {
  id: string;
  title: string;
  description: string;
  background: string;
  layout: 'wall' | 'grid' | 'brainstorm' | 'timeline';
  cover_image: string;
  password: string;
  owner: string;
  members: BoardMember[];
  my_role: BoardRole;
  post_count?: number;
  isPublic?: boolean;
  timelineDirection?: 'ltr' | 'rtl';
  created_at: string;
  updated_at: string;
  posts?: Post[];
}

export const POST_COLORS = [
  '#fef9c3',  // yellow
  '#fce7f3',  // pink
  '#ede9fe',  // lavender
  '#dbeafe',  // blue
  '#ccfbf1',  // teal
  '#dcfce7',  // green
  '#ffedd5',  // peach/orange
  '#fee2e2',  // red/blush
  '#e0f2fe',  // sky
  '#f3f4f6',  // neutral gray
];

export const BOARD_BACKGROUNDS = [
  { label: 'שקיעה',    value: 'linear-gradient(135deg, #fecdd3 0%, #fbcfe8 45%, #fed7aa 100%)' },
  { label: 'אוקיינוס', value: 'linear-gradient(135deg, #bfdbfe 0%, #c7d2fe 50%, #ddd6fe 100%)' },
  { label: 'יער',      value: 'linear-gradient(160deg, #bbf7d0 0%, #a7f3d0 45%, #99f6e4 100%)' },
  { label: 'לבנדר',    value: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 45%, #e0e7ff 100%)' },
  { label: 'אפרסק',    value: 'linear-gradient(135deg, #fed7aa 0%, #fecaca 40%, #fce7f3 100%)' },
  { label: 'שמיים',    value: 'linear-gradient(180deg, #bae6fd 0%, #e0f2fe 40%, #d1fae5 100%)' },
  { label: 'זהב',      value: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 45%, #fed7aa 100%)' },
  { label: 'ערפל',     value: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #f8fafc 100%)' },
  { label: 'אביב',     value: 'linear-gradient(150deg, #d1fae5 0%, #cffafe 45%, #dbeafe 100%)' },
  { label: 'ורוד',     value: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 45%, #f3e8ff 100%)' },
  { label: 'מנטה',     value: 'linear-gradient(160deg, #ccfbf1 0%, #d1fae5 45%, #cffafe 100%)' },
  { label: 'ענן',      value: 'linear-gradient(135deg, #e0f2fe 0%, #ede9fe 45%, #fce7f3 100%)' },
];

export const BOARD_WALLPAPERS = [
  {
    label: 'עץ',
    value: 'repeating-linear-gradient(90deg, rgba(110,55,8,0.18) 0, rgba(110,55,8,0.18) 2px, transparent 2px, transparent 100%), repeating-linear-gradient(89deg, rgba(90,45,5,0.1) 0, rgba(90,45,5,0.1) 2px, transparent 2px, transparent 100%)',
    size: '100% 5px, 100% 13px',
    bg: '#b87830',
  },
  {
    label: 'פסים',
    value: 'repeating-linear-gradient(0deg, transparent, transparent 7px, rgba(251,191,36,0.7) 7px, rgba(251,191,36,0.7) 14px)',
    size: '100% 14px',
    bg: '#7c2d12',
  },
  {
    label: 'בד ארוג',
    value: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.15) 0, rgba(255,255,255,0.15) 5px, rgba(0,0,0,0.1) 5px, rgba(0,0,0,0.1) 10px), repeating-linear-gradient(90deg, rgba(0,0,0,0.1) 0, rgba(0,0,0,0.1) 5px, rgba(255,255,255,0.08) 5px, rgba(255,255,255,0.08) 10px)',
    size: '10px 10px',
    bg: '#14532d',
  },
  {
    label: 'עשב',
    value: 'repeating-linear-gradient(175deg, transparent 0, transparent 3px, rgba(0,210,0,0.3) 3px, rgba(0,210,0,0.3) 5px, transparent 5px, transparent 9px), repeating-linear-gradient(168deg, transparent 0, transparent 5px, rgba(0,160,0,0.22) 5px, rgba(0,160,0,0.22) 7px, transparent 7px, transparent 13px)',
    size: '5px 22px, 8px 28px',
    bg: '#14521c',
  },
  {
    label: 'עור',
    value: 'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.12) 20%, transparent 60%), repeating-linear-gradient(45deg, rgba(0,0,0,0.16) 0, rgba(0,0,0,0.16) 2px, transparent 2px, transparent 50%), repeating-linear-gradient(-45deg, rgba(0,0,0,0.16) 0, rgba(0,0,0,0.16) 2px, transparent 2px, transparent 50%)',
    size: '22px 22px',
    bg: '#7c1515',
  },
  {
    label: 'גלים',
    value: 'repeating-radial-gradient(circle at 0 0, transparent 0, rgba(56,189,248,0.3) 7px), repeating-linear-gradient(rgba(14,165,233,0.25), rgba(14,165,233,0.25))',
    size: '12px 12px',
    bg: '#0c4a6e',
  },
  {
    label: 'יהלומים',
    value: 'repeating-linear-gradient(45deg, transparent, transparent 9px, rgba(192,132,252,0.55) 9px, rgba(192,132,252,0.55) 12px), repeating-linear-gradient(-45deg, transparent, transparent 9px, rgba(192,132,252,0.55) 9px, rgba(192,132,252,0.55) 12px)',
    size: '24px 24px',
    bg: '#2e1065',
  },
  {
    label: 'קווים',
    value: 'repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(251,146,60,0.65) 14px, rgba(251,146,60,0.65) 19px)',
    size: '19px 19px',
    bg: '#431407',
  },
  {
    label: 'גינס',
    value: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.13) 0, rgba(255,255,255,0.13) 3px, transparent 3px, transparent 9px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.13) 0, rgba(0,0,0,0.13) 3px, transparent 3px, transparent 9px)',
    size: '12px 12px',
    bg: '#1e3a6e',
  },
  {
    label: 'שיש',
    value: 'repeating-linear-gradient(130deg, rgba(255,255,255,0.2) 0, rgba(255,255,255,0.2) 2px, transparent 2px, transparent 44px), repeating-linear-gradient(52deg, rgba(255,255,255,0.09) 0, rgba(255,255,255,0.09) 2px, transparent 2px, transparent 58px)',
    size: '100px 100px',
    bg: '#18182a',
  },
  {
    label: 'נקודות',
    value: 'radial-gradient(circle, rgba(56,189,248,0.9) 6px, transparent 6px)',
    size: '34px 34px',
    bg: '#0c2d6e',
  },
  {
    label: 'פחמן',
    value: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.09) 0, rgba(255,255,255,0.09) 4px, rgba(0,0,0,0.2) 4px, rgba(0,0,0,0.2) 8px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.06) 0, rgba(255,255,255,0.06) 4px, rgba(0,0,0,0.16) 4px, rgba(0,0,0,0.16) 8px)',
    size: '8px 8px',
    bg: '#1a1a1a',
  },
  {
    label: 'סריגה',
    value: 'radial-gradient(ellipse 65% 45% at 50% 25%, rgba(255,255,255,0.25) 0%, transparent 80%), radial-gradient(ellipse 65% 45% at 50% 75%, rgba(0,0,0,0.2) 0%, transparent 80%)',
    size: '22px 14px',
    bg: '#581c87',
  },
  {
    label: 'כוכבים',
    value: 'radial-gradient(circle, rgba(216,180,254,0.9) 5px, transparent 5px)',
    size: '32px 32px',
    bg: '#2e1065',
  },
  {
    label: 'יהלומים ירוקים',
    value: 'repeating-linear-gradient(45deg, transparent, transparent 9px, rgba(52,211,153,0.55) 9px, rgba(52,211,153,0.55) 12px), repeating-linear-gradient(-45deg, transparent, transparent 9px, rgba(52,211,153,0.55) 9px, rgba(52,211,153,0.55) 12px)',
    size: '24px 24px',
    bg: '#052e16',
  },
  {
    label: 'רשת',
    value: 'linear-gradient(rgba(96,165,250,0.6) 3px, transparent 3px), linear-gradient(90deg, rgba(96,165,250,0.6) 3px, transparent 3px)',
    size: '30px 30px',
    bg: '#1e3a8a',
  },
];

export const BOARD_PHOTO_BACKGROUNDS = [
  { label: 'Soft Waves',            value: "url('/4935872.jpg') center/cover no-repeat" },
  { label: 'Warm Watercolor',       value: "url('/5590804.jpg') center/cover no-repeat" },
  { label: 'Abstract Blue Lines',   value: "url('/abstract-blue-background-with-smooth-shining-lines.jpg') center/cover no-repeat" },
  { label: 'Blue Wall',             value: "url('/blue-wall-background.jpg') center/cover no-repeat" },
  { label: 'Different Shapes',      value: "url('/different-shapes-cupboards.jpg') center/cover no-repeat" },
  { label: 'Eucalyptus Marble',     value: "url('/eucalyptus-leaf-psd-white-marble-background.jpg') center/cover no-repeat" },
  { label: 'Soft Grunge',           value: "url('/fz_125.jpg') center/cover no-repeat" },
  { label: 'Watercolor Sky',        value: "url('/hand-painted-watercolor-background-with-sky-clouds-shape.jpg') center/cover no-repeat" },
  { label: 'Blue Purple Shapes',    value: "url('/light-blue-purple-cupboards.jpg') center/cover no-repeat" },
  { label: 'Light Green Texture',   value: "url('/light-green-abstract-texture-background.jpg') center/cover no-repeat" },
  { label: 'Modern Halftone',       value: "url('/modern-halftone-style-background-with-smooth-blending.jpg') center/cover no-repeat" },
  { label: 'Purple Geometric',      value: "url('/paper-texture-background-abstract-geometric-pattern-pink-purple-violet.jpg') center/cover no-repeat" },
  { label: 'Green Waves',           value: "url('/rm222batch2-mind-06.jpg') center/cover no-repeat" },
  { label: 'Soft Gradient',         value: "url('/v904-nunny-006-f.jpg') center/cover no-repeat" },
  { label: 'Watercolor Brushstrokes', value: "url('/watercolor-abstract-brush-strokes-background.jpg') center/cover no-repeat" },
  { label: 'Stars', value: "url('/starts.png') center/cover no-repeat" },
];

export const LAYOUT_OPTIONS = [
  { id: 'wall',        label: 'קיר חופשי',    description: 'גרור פוסטים לכל מקום' },
  { id: 'grid',        label: 'רשת',           description: 'פריסה מסודרת בעמודות' },
  { id: 'brainstorm',  label: 'סיעור מוחות',   description: 'פוסטים כבועות מחשבה' },
  { id: 'timeline',    label: 'ציר זמן',       description: 'פוסטים לפי סדר כרונולוגי' },
] as const;

/** Returns the correct CSS style object for any board background value.
 *  Wallpapers need backgroundColor + backgroundImage + backgroundSize;
 *  gradients and photo backgrounds use the single `background` shorthand. */
export function getBoardBgStyle(background: string): CSSProperties {
  const wallpaper = BOARD_WALLPAPERS.find(w => w.value === background);
  if (wallpaper) {
    return {
      backgroundColor: wallpaper.bg,
      backgroundImage: wallpaper.value,
      backgroundSize: wallpaper.size,
    };
  }
  return { background };
}

export function canEdit(role: BoardRole | null | undefined) {
  return role === 'owner' || role === 'writer';
}

export function canComment(role: BoardRole | null | undefined) {
  return role === 'owner' || role === 'writer' || role === 'commenter';
}

export function canAdmin(role: BoardRole | null | undefined) {
  return role === 'owner';
}
