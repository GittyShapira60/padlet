import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

@Schema({ collection: 'users', toJSON: { virtuals: true }, toObject: { virtuals: true }, versionKey: false })
export class User {
  @Prop({ type: String })
  _id: string

  @Prop({ required: true })
  username: string

  @Prop({ type: String, default: null })
  passwordHash: string | null

  @Prop({ default: () => new Date() })
  createdAt: Date
}

export type UserDocument = HydratedDocument<User>
export const UserSchema = SchemaFactory.createForClass(User)
UserSchema.index({ username: 1 }, { unique: true })
