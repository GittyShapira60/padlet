import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

@Schema({ collection: 'menti_presentations', toJSON: { virtuals: true }, toObject: { virtuals: true }, versionKey: false })
export class MentiPresentation {
  @Prop({ type: String })
  _id: string

  @Prop({ required: true })
  title: string

  @Prop({ default: '' })
  description: string

  @Prop({ required: true })
  owner: string

  @Prop({ required: true })
  joinCode: string

  @Prop({ default: false })
  anonymousMode: boolean

  @Prop({ default: () => new Date() })
  createdAt: Date

  @Prop({ default: () => new Date() })
  updatedAt: Date
}

export type MentiPresentationDocument = HydratedDocument<MentiPresentation>
export const MentiPresentationSchema = SchemaFactory.createForClass(MentiPresentation)
MentiPresentationSchema.index({ joinCode: 1 }, { unique: true })
MentiPresentationSchema.index({ owner: 1 })
