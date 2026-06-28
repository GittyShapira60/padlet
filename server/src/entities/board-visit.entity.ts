import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm'

@Entity('board_visits')
export class BoardVisit {
  @PrimaryColumn()
  id: string

  @Column({ name: 'board_id' })
  boardId: string

  @Column()
  username: string

  @CreateDateColumn({ name: 'visited_at' })
  visitedAt: Date

  @Column({ name: 'duration_seconds', default: 0 })
  durationSeconds: number
}
