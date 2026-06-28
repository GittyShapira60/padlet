import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm'
import { BoardLayout } from '../common/enums'
import { BoardMember } from './board-member.entity'
import { Post } from './post.entity'

@Entity('boards')
export class Board {
  @PrimaryColumn()
  id: string

  @Column()
  title: string

  @Column({ default: '' })
  description: string

  @Column({ default: '#f0f4ff' })
  background: string

  @Column({ type: 'varchar', default: BoardLayout.WALL })
  layout: BoardLayout

  @Column({ name: 'cover_image', default: '' })
  coverImage: string

  @Column({ default: '' })
  password: string

  @Column({ default: '' })
  owner: string

  @Column({ name: 'is_public', default: false })
  isPublic: boolean

  @Column({ name: 'timeline_direction', default: 'rtl' })
  timelineDirection: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @OneToMany(() => BoardMember, (m) => m.board, { cascade: true })
  members: BoardMember[]

  @OneToMany(() => Post, (p) => p.board, { cascade: true })
  posts: Post[]
}
