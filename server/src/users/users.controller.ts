import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { User } from '../entities'

@Controller('api/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(@InjectRepository(User) private users: Repository<User>) {}

  @Get('exists')
  async exists(@Query('username') username: string) {
    const user = await this.users.findOne({ where: { username } })
    return { exists: !!user, username: user?.username ?? null }
  }

  @Get('search')
  async search(@Query('q') q: string) {
    if (!q || q.trim().length < 1) return []
    const users = await this.users
      .createQueryBuilder('u')
      .where('u.username ILIKE :q', { q: `${q.trim()}%` })
      .orderBy('u.username', 'ASC')
      .limit(6)
      .getMany()
    return users.map(u => u.username)
  }
}
