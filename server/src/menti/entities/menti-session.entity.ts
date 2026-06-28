import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm'
import { MentiPresentation } from './menti-presentation.entity'
import { MentiResponse } from './menti-response.entity'

@Entity('menti_sessions')
export class MentiSession {
  @PrimaryColumn() id: string
  @Column({ name: 'presentation_id' }) presentationId: string
  @Column({ name: 'current_slide_index', type: 'int', default: 0 }) currentSlideIndex: number
  @Column({ name: 'is_active', default: true }) isActive: boolean
  @Column({ name: 'is_voting_open', default: true }) isVotingOpen: boolean
  @Column({ name: 'results_visible', default: true }) resultsVisible: boolean
  @Column({ name: 'self_paced', default: false }) selfPaced: boolean

  @CreateDateColumn({ name: 'started_at' }) startedAt: Date
  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true }) endedAt: Date | null

  @ManyToOne(() => MentiPresentation, (p) => p.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'presentation_id' })
  presentation: MentiPresentation

  @OneToMany(() => MentiResponse, (r) => r.session, { cascade: true })
  responses: MentiResponse[]
}
