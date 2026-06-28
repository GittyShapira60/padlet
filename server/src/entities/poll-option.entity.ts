import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm'
import { Post } from './post.entity'

@Entity('poll_options')
export class PollOption {
  @PrimaryColumn()
  id: string

  @Column({ name: 'post_id' })
  postId: string

  @Column({ name: 'option_text' })
  optionText: string

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  post: Post
}
