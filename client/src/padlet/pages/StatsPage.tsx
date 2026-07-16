import { useState, useEffect } from 'react';
import { BarChart2, Layout, FileText, Share2, TrendingUp, Award, ArrowRight, Clock, Eye, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../lib/api';

interface BoardVisitStat {
  id: string;
  title: string;
  post_count: number;
  visit_count: number;
  unique_visitors: number;
  avg_duration: number;
}

interface BoardDayStat {
  date: string;
  count: number;
  unique_visitors: number;
  avg_duration: number;
}

interface BoardVisitor {
  username: string;
  visit_count: number;
  last_visit: string;
  avg_duration: number;
}

interface BoardStats {
  visits_per_day: BoardDayStat[];
  total_visits: number;
  unique_visitors: number;
  avg_duration: number;
  visitors?: BoardVisitor[];
}

interface StatsData {
  total_boards: number;
  total_posts: number;
  shared_boards: number;
  layout_counts: Record<string, number>;
  post_type_counts: Record<string, number>;
  posts_per_day: Array<{ date: string; count: number }>;
  top_boards: Array<{ id: string; title: string; post_count: number }>;
  top_boards_by_visits?: BoardVisitStat[];
  visits_per_day?: Array<{ date: string; count: number }>;
}

const LAYOUT_LABELS: Record<string, string> = {
  wall: 'קיר חופשי',
  grid: 'רשת',
  brainstorm: 'סיעור מוחות',
  timeline: 'ציר זמן',
};

const LAYOUT_COLORS: Record<string, string> = {
  wall: '#f97316',
  grid: '#8b5cf6',
  brainstorm: '#10b981',
  timeline: '#f59e0b',
};

const TYPE_LABELS: Record<string, string> = {
  text: 'טקסט',
  image: 'תמונה',
  link: 'לינק',
  poll: 'סקר',
};

const TYPE_COLORS: Record<string, string> = {
  text: '#f97316',
  image: '#3b82f6',
  link: '#10b981',
  poll: '#8b5cf6',
};

function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} שנ'`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} דק'`;
  const h = Math.floor(m / 60);
  return `${h} שע' ${m % 60} דק'`;
}

function BarChart({ data, color = '#f97316', label = '' }: { data: Array<{ date: string; count: number }>; color?: string; label?: string }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        אין נתונים ב-14 הימים האחרונים
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const chartW = 600;
  const chartH = 140;
  const padL = 32;
  const padB = 32;
  const padT = 10;
  const barAreaW = chartW - padL;
  const barAreaH = chartH - padB - padT;
  const barW = Math.min(36, (barAreaW / data.length) - 4);
  const gap = barAreaW / data.length;

  const fmtDate = (d: string) => {
    const dt = new Date(d);
    return `${dt.getDate()}/${dt.getMonth() + 1}`;
  };

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ minWidth: 300, maxHeight: 160 }}>
        {[0, 0.25, 0.5, 0.75, 1].map(frac => {
          const y = padT + barAreaH * (1 - frac);
          return (
            <g key={frac}>
              <line x1={padL} y1={y} x2={chartW} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <text x={padL - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#9ca3af">
                {Math.round(maxCount * frac)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const barH = (d.count / maxCount) * barAreaH;
          const x = padL + i * gap + (gap - barW) / 2;
          const y = padT + barAreaH - barH;
          return (
            <g key={d.date}>
              <rect x={x} y={y} width={barW} height={barH} rx={4} fill={`url(#barGrad-${color.replace('#','')})`} opacity={0.9} />
              {d.count > 0 && (
                <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize={9} fill={color} fontWeight="bold">
                  {d.count}
                </text>
              )}
              <text x={x + barW / 2} y={chartH - 4} textAnchor="middle" fontSize={8} fill="#9ca3af">
                {fmtDate(d.date)}
              </text>
            </g>
          );
        })}
        <defs>
          <linearGradient id={`barGrad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0.5" />
          </linearGradient>
        </defs>
      </svg>
      {label && <p className="text-xs text-gray-400 text-center mt-1">{label}</p>}
    </div>
  );
}

function DistributionBars({
  data, labels, colors,
}: {
  data: Record<string, number>;
  labels: Record<string, string>;
  colors: Record<string, string>;
}) {
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  if (total === 0) return <p className="text-gray-400 text-sm text-center py-4">אין נתונים</p>;

  return (
    <div className="space-y-3">
      {Object.entries(data)
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const color = colors[key] || '#94a3b8';
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">{labels[key] || key}</span>
                <span className="text-sm font-bold text-gray-500">{count} ({pct}%)</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div className="h-2.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
            </div>
          );
        })}
    </div>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: number | string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '20' }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function BoardVisitorChart({ boardId, boardTitle, token }: { boardId: string; boardTitle: string; token: string }) {
  const [boardStats, setBoardStats] = useState<BoardStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!boardId) return;
    setLoading(true);
    fetch(`${API}/api/boards/${boardId}/board-stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setBoardStats(data); })
      .finally(() => setLoading(false));
  }, [boardId, token]);

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!boardStats) return null;

  const visitsData = boardStats.visits_per_day.map(d => ({ date: d.date, count: d.count }));
  const uniqueData = boardStats.visits_per_day.map(d => ({ date: d.date, count: d.unique_visitors }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-blue-600">{boardStats.total_visits}</p>
          <p className="text-xs font-bold text-blue-500">סה"כ ביקורים</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-purple-600">{boardStats.unique_visitors}</p>
          <p className="text-xs font-bold text-purple-500">מבקרים ייחודיים</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-green-600">{fmtDuration(boardStats.avg_duration)}</p>
          <p className="text-xs font-bold text-green-500">זמן שהייה ממוצע</p>
        </div>
      </div>

      {visitsData.length > 0 ? (
        <>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">ביקורים ב-14 ימים אחרונים</p>
            <BarChart data={visitsData} color="#3b82f6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">מבקרים ייחודיים ב-14 ימים אחרונים</p>
            <BarChart data={uniqueData} color="#8b5cf6" />
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">אין נתוני ביקורים ב-14 הימים האחרונים</p>
      )}

      {boardStats.visitors && boardStats.visitors.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
            <Users size={12} /> רשימת המבקרים
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {boardStats.visitors.map((v) => (
              <div key={v.username} className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {v.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{v.username}</p>
                  <p className="text-xs text-gray-400">
                    {v.visit_count} ביקורים · שהות ממוצעת {fmtDuration(v.avg_duration)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-gray-400">
                    {new Date(v.last_visit).toLocaleDateString('he-IL', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const { token } = useAuth();

  useEffect(() => {
    fetch(`${API}/api/boards/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
        <BarChart2 size={40} className="text-gray-300" />
        <p>לא ניתן לטעון נתונים</p>
      </div>
    );
  }

  const totalPostTypes = Object.values(stats.post_type_counts).reduce((s, v) => s + v, 0);
  const mostUsedLayout = Object.entries(stats.layout_counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topBoard = stats.top_boards[0];
  const mostVisitedBoard = stats.top_boards_by_visits?.[0];

  const allBoards = [
    ...(stats.top_boards_by_visits || []),
    ...stats.top_boards.filter(b => !stats.top_boards_by_visits?.find(v => v.id === b.id)),
  ];

  const selectedBoard = allBoards.find(b => b.id === selectedBoardId);

  return (
    <div className="flex-1 overflow-auto bg-gray-50" dir="rtl">
      <div className="bg-gradient-to-l from-purple-600 via-pink-500 to-orange-500 text-white px-8 py-10">
        <div className="max-w-5xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-4 transition-colors">
            <ArrowRight size={16} />
            <span>חזרה ללוחות</span>
          </Link>
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
            <BarChart2 size={32} />
            סטטיסטיקות
          </h1>
          <p className="text-white/80 text-sm">נתוני הפעילות שלך ב-Padlet</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Layout size={22} />} label="לוחות שיצרתי" value={stats.total_boards} color="#f97316" />
          <StatCard icon={<FileText size={22} />} label="סך פוסטים" value={stats.total_posts} color="#8b5cf6" />
          <StatCard icon={<Share2 size={22} />} label="משותף איתי" value={stats.shared_boards} color="#3b82f6" />
          <StatCard
            icon={<Eye size={22} />}
            label="ביקורים בלוח הפופולרי"
            value={mostVisitedBoard ? `${mostVisitedBoard.visit_count} ביקורים` : '—'}
            color="#10b981"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-gray-800 text-base mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-orange-500" />
            פוסטים ב-14 הימים האחרונים
          </h2>
          <BarChart data={stats.posts_per_day} color="#f97316" />
        </div>

        {stats.visits_per_day && stats.visits_per_day.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-800 text-base mb-4 flex items-center gap-2">
              <Eye size={18} className="text-blue-500" />
              ביקורים ב-14 הימים האחרונים
            </h2>
            <BarChart data={stats.visits_per_day} color="#3b82f6" />
          </div>
        )}

        {allBoards.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-800 text-base mb-4 flex items-center gap-2">
              <Users size={18} className="text-purple-500" />
              ביקורים לפי לוח ספציפי
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-2">בחר לוח לצפייה בנתוניו</label>
              <select
                value={selectedBoardId}
                onChange={e => setSelectedBoardId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50"
                dir="rtl"
              >
                <option value="">— בחר לוח —</option>
                {allBoards.map(b => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
            </div>
            {selectedBoardId && selectedBoard && (
              <BoardVisitorChart
                boardId={selectedBoardId}
                boardTitle={selectedBoard.title}
                token={token || ''}
              />
            )}
            {!selectedBoardId && (
              <p className="text-sm text-gray-400 text-center py-6">בחר לוח כדי לראות נתוני הביקורים שלו</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-800 text-base mb-4 flex items-center gap-2">
              <Layout size={18} className="text-purple-500" />
              פיזור פריסות
            </h2>
            <DistributionBars data={stats.layout_counts} labels={LAYOUT_LABELS} colors={LAYOUT_COLORS} />
            {mostUsedLayout && (
              <p className="text-xs text-gray-400 mt-3 text-center">
                הפריסה הנפוצה ביותר: {LAYOUT_LABELS[mostUsedLayout] || mostUsedLayout}
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-800 text-base mb-4 flex items-center gap-2">
              <FileText size={18} className="text-blue-500" />
              סוגי פוסטים
            </h2>
            <DistributionBars data={stats.post_type_counts} labels={TYPE_LABELS} colors={TYPE_COLORS} />
          </div>
        </div>

        {stats.top_boards_by_visits && stats.top_boards_by_visits.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-800 text-base mb-4 flex items-center gap-2">
              <Eye size={18} className="text-blue-500" />
              הלוחות הכי מבוקשים (לפי ביקורים)
            </h2>
            <div className="space-y-3">
              {stats.top_boards_by_visits.map((board, i) => {
                const maxVisits = stats.top_boards_by_visits![0]?.visit_count || 1;
                const pct = maxVisits > 0 ? Math.round((board.visit_count / maxVisits) * 100) : 0;
                const rankStyle = [
                  'text-amber-400 font-bold text-lg',
                  'text-slate-400 font-bold text-lg',
                  'text-orange-700 font-bold text-lg',
                ];
                return (
                  <div key={board.id} className="flex items-center gap-3">
                    <span className={`w-6 flex-shrink-0 text-center ${rankStyle[i] ?? 'text-gray-300 font-semibold text-sm'}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <Link to={`/board/${board.id}`} className="text-sm font-medium text-gray-800 truncate hover:text-orange-500">
                          {board.title}
                        </Link>
                        <div className="flex items-center gap-3 flex-shrink-0 mr-2">
                          <span className="text-xs text-blue-600 flex items-center gap-1">
                            <Eye size={10} /> {board.visit_count} ביקורים
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock size={10} /> {fmtDuration(board.avg_duration)} ממוצע
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-gradient-to-l from-blue-500 to-cyan-400 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {board.unique_visitors} מבקרים ייחודיים · {board.post_count} פוסטים
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {stats.top_boards.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-800 text-base mb-4 flex items-center gap-2">
              <Award size={18} className="text-yellow-500" />
              הלוחות הפעילים ביותר (לפי פוסטים)
            </h2>
            <div className="space-y-3">
              {stats.top_boards.map((board, i) => {
                const maxPosts = stats.top_boards[0]?.post_count || 1;
                const pct = maxPosts > 0 ? Math.round((board.post_count / maxPosts) * 100) : 0;
                const rankStyle = [
                  'text-amber-400 font-bold text-lg',
                  'text-slate-400 font-bold text-lg',
                  'text-orange-700 font-bold text-lg',
                ];
                return (
                  <div key={board.id} className="flex items-center gap-3">
                    <span className={`w-6 flex-shrink-0 text-center ${rankStyle[i] ?? 'text-gray-300 font-semibold text-sm'}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <Link to={`/board/${board.id}`} className="text-sm font-medium text-gray-800 truncate hover:text-orange-500">
                          {board.title}
                        </Link>
                        <span className="text-xs text-gray-500 flex-shrink-0 mr-2">{board.post_count} פוסטים</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-gradient-to-l from-orange-500 to-yellow-400 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {stats.total_boards === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BarChart2 size={32} className="text-gray-400" />
            </div>
            <h3 className="font-bold text-gray-700 text-lg mb-2">עדיין אין נתונים</h3>
            <p className="text-gray-400 text-sm">צור לוחות ופוסטים כדי לראות סטטיסטיקות</p>
          </div>
        )}
      </div>
    </div>
  );
}
