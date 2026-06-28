import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { MentiSession } from './menti-session.entity'
import { MentiSlide } from './menti-slide.entity'

@Entity('menti_responses')
export class MentiResponse {
  @PrimaryColumn() id: string
  @Column({ name: 'session_id' }) sessionId: string
  @Column({ name: 'slide_id' }) slideId: string
  @Column({ type: 'text', nullable: true }) respondent: string | null
  @Column({ type: 'jsonb' }) answer: Record<string, unknown>
  @Column({ name: 'is_answered', default: false }) isAnswered: boolean

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date

  @ManyToOne(() => MentiSession, (s) => s.responses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: MentiSession

  @ManyToOne(() => MentiSlide, (s) => s.responses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'slide_id' })
  slide: MentiSlide
}
