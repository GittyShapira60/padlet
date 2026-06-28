import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn } from 'typeorm'
import { BoardMember } from './board-member.entity'

@Entity('users')
export class User {
  @PrimaryColumn()
  id: string

  @Column({ unique: true })
  username: string

  @Column({ name: 'password_hash', nullable: true, type: 'varchar' })
  passwordHash: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @OneToMany(() => BoardMember, (m) => m.user)
  memberships: BoardMember[]
}
