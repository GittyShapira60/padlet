import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm'
import { Post } from './post.entity'

@Entity('post_likes')
export class PostLike {
  @PrimaryColumn({ name: 'post_id' })
  postId: string

  @PrimaryColumn()
  username: string

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  post: Post
}
