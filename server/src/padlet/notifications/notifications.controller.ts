import { Controller, Delete, Get, HttpCode, Param, Put, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { User } from '../../entities'
import { NotificationsService } from './notifications.service'

@Controller('api/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.notifications.findAll(user.username)
  }

  @Put('read')
  markAllRead(@CurrentUser() user: User) {
    return this.notifications.markAllRead(user.username)
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notifications.delete(id, user.username)
  }
}
