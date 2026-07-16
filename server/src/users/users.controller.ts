import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { User, UserDocument } from '../entities'

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

@Controller('api/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(@InjectModel(User.name) private users: Model<UserDocument>) {}

  @Get('exists')
  async exists(@Query('username') username: string) {
    const user = await this.users.findOne({ username })
    return { exists: !!user, username: user?.username ?? null }
  }

  @Get('search')
  async search(@Query('q') q: string) {
    if (!q || q.trim().length < 1) return []
    const users = await this.users
      .find({ username: { $regex: `^${escapeRegex(q.trim())}`, $options: 'i' } })
      .sort({ username: 1 })
      .limit(6)
    return users.map((u) => u.username)
  }
}
