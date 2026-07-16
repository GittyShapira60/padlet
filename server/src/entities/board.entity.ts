import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
import { BoardLayout } from '../common/enums'

@Schema({ collection: 'boards', toJSON: { virtuals: true }, toObject: { virtuals: true }, versionKey: false })
export class Board {
  @Prop({ type: String })
  _id: string

  @Prop({ required: true })
  title: string

  @Prop({ default: '' })
  description: string

  @Prop({ default: '#f0f4ff' })
  background: string

  @Prop({ type: String, default: BoardLayout.WALL })
  layout: BoardLayout

  @Prop({ default: '' })
  coverImage: string

  @Prop({ default: '' })
  password: string

  @Prop({ default: '' })
  owner: string

  @Prop({ default: false })
  isPublic: boolean

  @Prop({ default: 'rtl' })
  timelineDirection: string

  @Prop({ default: () => new Date() })
  createdAt: Date

  @Prop({ default: () => new Date() })
  updatedAt: Date
}

export type BoardDocument = HydratedDocument<Board>
export const BoardSchema = SchemaFactory.createForClass(Board)
