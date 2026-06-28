import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryColumn, Unique } from 'typeorm'
import { PollOption } from './poll-option.entity'
import { Post } from './post.entity'

@Entity('poll_votes')
@Unique(['postId', 'username'])
export class PollVote {
  @PrimaryColumn()
  id: string

  @Column({ name: 'post_id' })
  postId: string

  @Column({ name: 'option_id' })
  optionId: string

  @Column()
  username: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  post: Post

  @ManyToOne(() => PollOption, { onDelete: 'CASCADE' })
  option: PollOption
}
