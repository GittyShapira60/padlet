import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryColumn } from 'typeorm'
import { Post } from './post.entity'

@Entity('comments')
export class Comment {
  @PrimaryColumn()
  id: string

  @Column({ name: 'post_id' })
  postId: string

  @Column()
  content: string

  @Column({ default: 'אנונימי' })
  author: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @ManyToOne(() => Post, (p) => p.comments, { onDelete: 'CASCADE' })
  post: Post
}
