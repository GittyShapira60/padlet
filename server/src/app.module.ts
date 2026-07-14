import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'node:path'
import { AuthModule } from './auth/auth.module'
import { BoardsModule } from './padlet/boards/boards.module'
import { GatewayModule } from './gateway/gateway.module'
import { MentiModule } from './menti/menti.module'
import { NotificationsModule } from './padlet/notifications/notifications.module'
import { PostsModule } from './padlet/posts/posts.module'
import { UploadsModule } from './padlet/uploads/uploads.module'
import { UsersModule } from './users/users.module'

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/padlet_dev'),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    AuthModule,
    BoardsModule,
    PostsModule,
    NotificationsModule,
    GatewayModule,
    MentiModule,
    UsersModule,
    UploadsModule,
  ],
})
export class AppModule {}
