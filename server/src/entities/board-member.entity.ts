import { Column, Entity, ManyToOne, PrimaryColumn, Unique } from 'typeorm'
import { BoardRole } from '../common/enums'
import { Board } from './board.entity'
import { User } from './user.entity'

@Entity('board_members')
@Unique(['boardId', 'username'])
export class BoardMember {
  @PrimaryColumn()
  id: string

  @Column({ name: 'board_id' })
  boardId: string

  @Column()
  username: string

  @Column({ type: 'varchar', default: BoardRole.WRITER })
  role: BoardRole

  @ManyToOne(() => Board, (b) => b.members, { onDelete: 'CASCADE' })
  board: Board

  @ManyToOne(() => User, (u) => u.memberships, { onDelete: 'CASCADE' })
  user: User
}
