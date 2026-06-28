import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm'

@Entity('notifications')
export class Notification {
  @PrimaryColumn()
  id: string

  @Column()
  username: string

  @Column({ default: 'shared' })
  type: string

  @Column()
  message: string

  @Column({ name: 'board_id', default: '' })
  boardId: string

  @Column({ name: 'board_title', default: '' })
  boardTitle: string

  @Column({ default: false })
  read: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
