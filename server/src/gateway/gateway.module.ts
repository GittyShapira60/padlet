import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BoardVisit } from '../entities'
import { EventsGateway } from './events.gateway'

@Module({
  imports: [TypeOrmModule.forFeature([BoardVisit])],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class GatewayModule {}
