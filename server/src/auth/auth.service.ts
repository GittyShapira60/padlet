import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcryptjs'
import { Repository } from 'typeorm'
import { v4 as uuid } from 'uuid'
import { User } from '../entities'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.users.findOne({ where: { username: dto.username } })
    if (exists) throw new ConflictException('Username already taken')

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const user = this.users.create({ id: uuid(), username: dto.username, passwordHash })
    await this.users.save(user)

    return this.sign(user)
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({ where: { username: dto.username } })
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials')

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Invalid credentials')

    return this.sign(user)
  }

  async getProfile(userId: string) {
    return this.users.findOneOrFail({ where: { id: userId } })
  }

  async existsByUsername(username: string): Promise<boolean> {
    const count = await this.users.count({ where: { username } })
    return count > 0
  }

  private sign(user: User) {
    const payload = { sub: user.id, username: user.username }
    return {
      token: this.jwt.sign(payload),
      username: user.username,
    }
  }
}
