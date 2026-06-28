import { Entity, ManyToOne, PrimaryColumn } from 'typeorm'
import { Post } from './post.entity'

// PK = (post_id, username, emoji) — one row per user per emoji type
@Entity('post_reactions')
export class PostReaction {
  @PrimaryColumn({ name: 'post_id' })
  postId: string

  @PrimaryColumn()
  username: string

  @PrimaryColumn()
  emoji: string

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  post: Post
}
