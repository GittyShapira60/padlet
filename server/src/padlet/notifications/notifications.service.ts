import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { mapNotification } from '../../common/utils/notification.util'
import { Notification, NotificationDocument } from '../../entities'

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private repo: Model<NotificationDocument>,
  ) {}

  async findAll(username: string) {
    const list = await this.repo.find({ username }).sort({ createdAt: -1 }).limit(50)
    return list.map(mapNotification)
  }

  async markAllRead(username: string): Promise<{ ok: true }> {
    await this.repo.updateMany({ username }, { $set: { read: true } })
    return { ok: true }
  }

  async delete(id: string, username: string): Promise<void> {
    await this.repo.deleteOne({ _id: id, username })
  }
}
