import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { BoardVisit, BoardVisitSchema } from '../entities'
import { EventsGateway } from './events.gateway'

@Module({
  imports: [MongooseModule.forFeature([{ name: BoardVisit.name, schema: BoardVisitSchema }])],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class GatewayModule {}
