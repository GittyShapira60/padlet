export type SlideType = 'multiple_choice' | 'word_cloud' | 'open_text' | 'scale' | 'ranking' | 'qa'

export interface MultipleChoiceConfig { options: string[]; allowMultiple: boolean }
export interface ScaleConfig { min: number; max: number; minLabel: string; maxLabel: string }
export interface RankingConfig { items: string[] }

export interface MentiSlide {
  id: string
  presentationId: string
  order: number
  type: SlideType
  question: string
  config: Record<string, unknown>
  createdAt: string
}

export interface MentiPresentation {
  id: string
  title: string
  description: string
  owner: string
  joinCode: string
  anonymousMode: boolean
  slides: MentiSlide[]
  slideCount?: number
  createdAt: string
  updatedAt: string
}

export interface MentiSession {
  id: string
  presentationId: string
  currentSlideIndex: number
  isActive: boolean
  isVotingOpen: boolean
  resultsVisible: boolean
  selfPaced: boolean
  startedAt: string
  endedAt: string | null
}

// ─── Results ──────────────────────────────────────────────────────────────────

export interface MultipleChoiceResults { tally: Record<string, number>; total: number }
export interface WordCloudResults { words: Record<string, number>; total: number }
export interface OpenTextResults { texts: string[]; total: number }
export interface ScaleResults { average: number; distribution: Record<number, number>; total: number }
export interface RankingResults { ranked: { item: string; score: number; rank: number }[]; total: number }
export interface QAResults { questions: { id: string; question: string; createdAt: string; isAnswered: boolean }[]; total: number }

export type SlideResults =
  | MultipleChoiceResults
  | WordCloudResults
  | OpenTextResults
  | ScaleResults
  | RankingResults
  | QAResults

export interface SlideResultEntry {
  slideId: string
  type: SlideType
  question: string
  config: Record<string, unknown>
  results: SlideResults
}

export interface SessionResults {
  session: { id: string; currentSlideIndex: number; isActive: boolean; isVotingOpen: boolean; resultsVisible: boolean; selfPaced: boolean }
  slides: SlideResultEntry[]
}

// ─── Answers ──────────────────────────────────────────────────────────────────

export type SlideAnswer =
  | { selected: string[] }       // multiple_choice
  | { words: string[] }          // word_cloud
  | { text: string }             // open_text
  | { value: number }            // scale
  | { order: string[] }          // ranking
  | { question: string }         // qa

export const SLIDE_TYPE_LABELS: Record<SlideType, string> = {
  multiple_choice: 'בחירה מרובה',
  word_cloud: 'ענן מילים',
  open_text: 'טקסט חופשי',
  scale: 'סולם',
  ranking: 'דירוג',
  qa: 'שאלות ותשובות',
}

export const SLIDE_TYPE_ICONS: Record<SlideType, string> = {
  multiple_choice: '◉',
  word_cloud: '◌',
  open_text: '≡',
  scale: '◑',
  ranking: '↑',
  qa: '?',
}
