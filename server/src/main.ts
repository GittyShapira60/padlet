import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  )

  app.useGlobalFilters(new AllExceptionsFilter())

  const port = process.env.PORT ?? 3001
  await app.listen(port)
  console.log(`Server running on http://localhost:${port}`)
}

bootstrap()
