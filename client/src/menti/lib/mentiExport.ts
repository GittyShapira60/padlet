import type { SlideResultEntry, SlideResults, WordCloudResults, MultipleChoiceResults, ScaleResults, RankingResults, OpenTextResults, QAResults } from '../types'
import { SLIDE_TYPE_LABELS } from '../types'

// ─── CSV / Excel export ──────────────────────────────────────────────────────

function formatResults(entry: SlideResultEntry): string {
  const r = entry.results as unknown as Record<string, unknown>
  switch (entry.type) {
    case 'word_cloud': {
      const wc = r as unknown as WordCloudResults
      return Object.entries(wc.words)
        .sort(([, a], [, b]) => b - a)
        .map(([w, c]) => c > 1 ? `${w} (${c})` : w)
        .join(', ')
    }
    case 'multiple_choice': {
      const mc = r as unknown as MultipleChoiceResults
      return Object.entries(mc.tally)
        .map(([opt, count]) => `${opt}: ${count}`)
        .join(' | ')
    }
    case 'scale': {
      const sc = r as unknown as ScaleResults
      return `ממוצע: ${sc.average} (${sc.total} תגובות)`
    }
    case 'ranking': {
      const rk = r as unknown as RankingResults
      return rk.ranked.map((item, i) => `${i + 1}. ${item.item}`).join(', ')
    }
    case 'open_text': {
      const ot = r as unknown as OpenTextResults
      return ot.texts.join(' | ')
    }
    case 'qa': {
      const qa = r as unknown as QAResults
      return qa.questions.map((q) => q.question).join(' | ')
    }
    default:
      return ''
  }
}

export function exportToCSV(slides: SlideResultEntry[], title: string) {
  const header = ['מספר שאלה', 'סוג', 'שאלה', 'תשובות / תוצאות'].join(',')
  const rows = slides.map((slide, i) => {
    const q = `"${(slide.question || 'שאלה ללא כותרת').replace(/"/g, '""')}"`
    const type = `"${SLIDE_TYPE_LABELS[slide.type]}"`
    const answers = `"${formatResults(slide).replace(/"/g, '""')}"`
    return [i + 1, type, q, answers].join(',')
  })
  const csvContent = '﻿' + [header, ...rows].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title || 'מצגת'}-תוצאות.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── PDF export (print window) ────────────────────────────────────────────────

function resultsHTML(entry: SlideResultEntry): string {
  const r = entry.results as unknown as Record<string, unknown>
  switch (entry.type) {
    case 'word_cloud': {
      const wc = r as unknown as WordCloudResults
      const words = Object.entries(wc.words)
        .sort(([, a], [, b]) => b - a)
        .map(([w, c]) => `<span style="font-size:${0.9 + (c / Math.max(...Object.values(wc.words))) * 1.4}em;font-weight:bold;color:#4f46e5;margin:3px">${w}${c > 1 ? `<sup>(${c})</sup>` : ''}</span>`)
        .join('')
      return `<div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px 0">${words}</div><p style="color:#888;font-size:0.75em">${wc.total} תשובות</p>`
    }
    case 'multiple_choice': {
      const mc = r as unknown as MultipleChoiceResults
      const total = mc.total || 1
      return Object.entries(mc.tally).map(([opt, count]) =>
        `<div style="margin:4px 0"><span style="font-weight:600">${opt}</span> — ${count} (${Math.round(count/total*100)}%)</div>`
      ).join('') + `<p style="color:#888;font-size:0.75em">${mc.total} תגובות</p>`
    }
    case 'scale': {
      const sc = r as unknown as ScaleResults
      return `<p style="font-size:2em;font-weight:bold;color:#4f46e5">${sc.average}</p><p style="color:#888;font-size:0.75em">${sc.total} תגובות</p>`
    }
    case 'ranking': {
      const rk = r as unknown as RankingResults
      return rk.ranked.map((item) =>
        `<div style="margin:3px 0"><strong>${item.rank}.</strong> ${item.item} <span style="color:#888">(ציון: ${item.score})</span></div>`
      ).join('')
    }
    case 'open_text': {
      const ot = r as unknown as OpenTextResults
      return ot.texts.map((t) => `<div style="padding:4px 8px;background:#f3f4f6;border-radius:6px;margin:3px 0">${t}</div>`).join('')
    }
    case 'qa': {
      const qa = r as unknown as QAResults
      return qa.questions.map((q) => `<div style="padding:4px 8px;background:#f3f4f6;border-radius:6px;margin:3px 0">${q.question}${q.isAnswered ? ' ✓' : ''}</div>`).join('')
    }
    default:
      return ''
  }
}

export function exportToPDF(slides: SlideResultEntry[], title: string) {
  const slideCards = slides.map((slide, i) => `
    <div style="break-inside:avoid;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="background:#e0e7ff;color:#4338ca;border-radius:20px;padding:2px 10px;font-size:0.75em;font-weight:700">
          שאלה ${i + 1} · ${SLIDE_TYPE_LABELS[slide.type]}
        </span>
      </div>
      <h3 style="font-size:1.1em;font-weight:700;margin:0 0 12px;color:#111">${slide.question || 'שאלה ללא כותרת'}</h3>
      <div>${resultsHTML(slide)}</div>
    </div>
  `).join('')

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8" />
  <title>${title || 'מצגת'} – תוצאות</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, 'Segoe UI', Arial, sans-serif; background:#f9fafb; color:#111; padding:24px; direction:rtl }
    h1 { font-size:1.5em; color:#1e1b4b; margin:0 0 6px }
    p { margin:0 0 16px; color:#6b7280; font-size:0.875em }
    @media print { body { background:#fff; padding:12px } }
  </style>
</head>
<body>
  <h1>${title || 'מצגת'} – תוצאות</h1>
  <p>סיכום כל השאלות והתוצאות</p>
  ${slideCards}
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  setTimeout(() => { win.print() }, 400)
}
