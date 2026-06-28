import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Board, BoardMember, BoardVisit, Notification, PollOption, Post } from '../../entities'
import { GatewayModule } from '../../gateway/gateway.module'
import { BoardsController } from './boards.controller'
import { BoardsService } from './boards.service'

@Module({
  imports: [TypeOrmModule.forFeature([Board, BoardMember, BoardVisit, Post, Notification, PollOption]), GatewayModule],
  providers: [BoardsService],
  controllers: [BoardsController],
  exports: [BoardsService],
})
export class BoardsModule {}
