import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm'
import { PostType } from '../common/enums'
import { Board } from './board.entity'
import { Comment } from './comment.entity'

@Entity('posts')
export class Post {
  @PrimaryColumn()
  id: string

  @Column({ name: 'board_id' })
  boardId: string

  @Column({ type: 'varchar', default: PostType.TEXT })
  type: PostType

  @Column({ default: '' })
  content: string

  @Column({ default: 'אנונימי' })
  author: string

  @Column({ default: '#fef08a' })
  color: string

  @Column({ type: 'float8', default: 100 })
  x: number

  @Column({ type: 'float8', default: 100 })
  y: number

  @Column({ type: 'float8', default: 220 })
  width: number

  @Column({ default: 0 })
  likes: number

  @Column({ name: 'image_url', default: '' })
  imageUrl: string

  @Column({ name: 'link_url', default: '' })
  linkUrl: string

  @Column({ name: 'link_title', default: '' })
  linkTitle: string

  @Column({ name: 'link_description', default: '' })
  linkDescription: string

  @Column({ name: 'link_image', default: '' })
  linkImage: string

  @Column({ name: 'edited_by', default: '' })
  editedBy: string

  @Column({ default: 'rect' })
  shape: string

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @ManyToOne(() => Board, (b) => b.posts, { onDelete: 'CASCADE' })
  board: Board

  @OneToMany(() => Comment, (c) => c.post, { cascade: true })
  comments: Comment[]
}
