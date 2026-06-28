import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm'
import { MentiPresentation } from './menti-presentation.entity'
import { MentiResponse } from './menti-response.entity'

export enum SlideType {
  MULTIPLE_CHOICE = 'multiple_choice',
  WORD_CLOUD = 'word_cloud',
  OPEN_TEXT = 'open_text',
  SCALE = 'scale',
  RANKING = 'ranking',
  QA = 'qa',
}

@Entity('menti_slides')
export class MentiSlide {
  @PrimaryColumn() id: string
  @Column({ name: 'presentation_id' }) presentationId: string
  @Column({ type: 'int', default: 0 }) order: number
  @Column({ type: 'varchar' }) type: SlideType
  @Column({ default: '' }) question: string
  @Column({ type: 'jsonb', default: '{}' }) config: Record<string, unknown>

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date

  @ManyToOne(() => MentiPresentation, (p) => p.slides, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'presentation_id' })
  presentation: MentiPresentation

  @OneToMany(() => MentiResponse, (r) => r.slide)
  responses: MentiResponse[]
}
