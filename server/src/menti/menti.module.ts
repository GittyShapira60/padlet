import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import {
  MentiPresentation, MentiPresentationSchema,
  MentiResponse, MentiResponseSchema,
  MentiSession, MentiSessionSchema,
  MentiSlide, MentiSlideSchema,
} from './entities'
import { GatewayModule } from '../gateway/gateway.module'
import { MentiController } from './menti.controller'
import { MentiService } from './menti.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MentiPresentation.name, schema: MentiPresentationSchema },
      { name: MentiSlide.name, schema: MentiSlideSchema },
      { name: MentiSession.name, schema: MentiSessionSchema },
      { name: MentiResponse.name, schema: MentiResponseSchema },
    ]),
    GatewayModule,
  ],
  providers: [MentiService],
  controllers: [MentiController],
})
export class MentiModule {}
