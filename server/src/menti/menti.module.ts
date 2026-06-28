import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MentiPresentation, MentiResponse, MentiSession, MentiSlide } from './entities'
import { GatewayModule } from '../gateway/gateway.module'
import { MentiController } from './menti.controller'
import { MentiService } from './menti.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([MentiPresentation, MentiSlide, MentiSession, MentiResponse]),
    GatewayModule,
  ],
  providers: [MentiService],
  controllers: [MentiController],
})
export class MentiModule {}
