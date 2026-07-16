import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

@Schema({ collection: 'notifications', toJSON: { virtuals: true }, toObject: { virtuals: true }, versionKey: false })
export class Notification {
  @Prop({ type: String })
  _id: string

  @Prop({ required: true })
  username: string

  @Prop({ default: 'shared' })
  type: string

  @Prop({ required: true })
  message: string

  @Prop({ default: '' })
  boardId: string

  @Prop({ default: '' })
  boardTitle: string

  @Prop({ default: false })
  read: boolean

  @Prop({ default: () => new Date() })
  createdAt: Date
}

export type NotificationDocument = HydratedDocument<Notification>
export const NotificationSchema = SchemaFactory.createForClass(Notification)
NotificationSchema.index({ username: 1 })
