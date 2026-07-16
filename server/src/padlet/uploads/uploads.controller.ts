import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { memoryStorage } from 'multer'
import { v4 as uuid } from 'uuid'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { buildS3Url, S3_BUCKET, s3Client } from '../../common/s3/s3.util'

@Controller('api')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded')

    const key = `${uuid()}-${file.originalname}`
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    )

    return { url: buildS3Url(key) }
  }

  @Post('link-preview')
  async linkPreview(@Body() body: { url: string }) {
    const url = body?.url
    if (!url) throw new BadRequestException('url is required')

    try {
      const fetch = (await import('node-fetch')).default
      const res = await fetch(url, { headers: { 'User-Agent': 'Padlet-Bot/1.0' }, redirect: 'follow' })
      const html = await res.text()

      const getMeta = (name: string) => {
        const patterns = [
          new RegExp(`<meta\\s+(?:property|name)=["']${name}["']\\s+content=["']([^"']+)["']`, 'i'),
          new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+(?:property|name)=["']${name}["']`, 'i'),
        ]
        for (const p of patterns) {
          const m = html.match(p)
          if (m?.[1]) return m[1]
        }
        return ''
      }

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)

      return {
        title: getMeta('og:title') || titleMatch?.[1] || url,
        description: getMeta('og:description') || getMeta('description'),
        image: getMeta('og:image'),
        url,
      }
    } catch {
      return { title: url, description: '', image: '', url }
    }
  }
}
