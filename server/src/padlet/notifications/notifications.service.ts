import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { mapNotification } from '../../common/utils/notification.util'
import { Notification } from '../../entities'

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private repo: Repository<Notification>,
  ) {}

  async findAll(username: string) {
    const list = await this.repo.find({
      where: { username },
      order: { createdAt: 'DESC' },
      take: 50,
    })
    return list.map(mapNotification)
  }

  async markAllRead(username: string): Promise<{ ok: true }> {
    await this.repo.update({ username }, { read: true })
    return { ok: true }
  }

  async delete(id: string, username: string): Promise<void> {
    await this.repo.delete({ id, username })
  }
}
