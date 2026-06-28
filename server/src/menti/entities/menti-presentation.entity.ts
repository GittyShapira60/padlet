import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm'
import { MentiSession } from './menti-session.entity'
import { MentiSlide } from './menti-slide.entity'

@Entity('menti_presentations')
export class MentiPresentation {
  @PrimaryColumn() id: string
  @Column() title: string
  @Column({ default: '' }) description: string
  @Column() owner: string
  @Column({ name: 'join_code', unique: true }) joinCode: string
  @Column({ name: 'anonymous_mode', default: false }) anonymousMode: boolean

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date

  @OneToMany(() => MentiSlide, (s) => s.presentation, { cascade: true })
  slides: MentiSlide[]

  @OneToMany(() => MentiSession, (s) => s.presentation, { cascade: true })
  sessions: MentiSession[]
}
