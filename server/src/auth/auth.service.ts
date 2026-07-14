import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectModel } from '@nestjs/mongoose'
import * as bcrypt from 'bcryptjs'
import { Model } from 'mongoose'
import { v4 as uuid } from 'uuid'
import { User, UserDocument } from '../entities'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private users: Model<UserDocument>,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.users.findOne({ username: dto.username })
    if (exists) throw new ConflictException('Username already taken')

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const user = await this.users.create({ _id: uuid(), username: dto.username, passwordHash })

    return this.sign(user)
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({ username: dto.username })
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials')

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Invalid credentials')

    return this.sign(user)
  }

  async getProfile(userId: string) {
    const user = await this.users.findOne({ _id: userId })
    if (!user) throw new NotFoundException()
    return user
  }

  async existsByUsername(username: string): Promise<boolean> {
    const count = await this.users.countDocuments({ username })
    return count > 0
  }

  private sign(user: UserDocument) {
    const payload = { sub: user._id, username: user.username }
    return {
      token: this.jwt.sign(payload),
      username: user.username,
    }
  }
}
