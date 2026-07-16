import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
import { BoardRole } from '../common/enums'

@Schema({ collection: 'board_members', toJSON: { virtuals: true }, toObject: { virtuals: true }, versionKey: false })
export class BoardMember {
  @Prop({ type: String })
  _id: string

  @Prop({ required: true })
  boardId: string

  @Prop({ required: true })
  username: string

  @Prop({ type: String, default: BoardRole.WRITER })
  role: BoardRole
}

export type BoardMemberDocument = HydratedDocument<BoardMember>
export const BoardMemberSchema = SchemaFactory.createForClass(BoardMember)
BoardMemberSchema.index({ boardId: 1, username: 1 }, { unique: true })
