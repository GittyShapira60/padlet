import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'

export const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1'
export const S3_BUCKET = process.env.AWS_S3_BUCKET ?? ''
// Optional CDN/public domain (e.g. CloudFront) fronting the bucket, no trailing slash
export const S3_PUBLIC_URL = process.env.AWS_S3_PUBLIC_URL?.replace(/\/$/, '')

export const s3Client = new S3Client({ region: AWS_REGION })

export function buildS3Url(key: string): string {
  if (S3_PUBLIC_URL) return `${S3_PUBLIC_URL}/${key}`
  return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`
}

function extractS3Key(url: string): string | null {
  const prefixes = [
    S3_PUBLIC_URL ? `${S3_PUBLIC_URL}/` : null,
    `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/`,
    `https://${S3_BUCKET}.s3.amazonaws.com/`,
  ].filter((p): p is string => !!p)

  for (const prefix of prefixes) {
    if (url.startsWith(prefix)) return decodeURIComponent(url.slice(prefix.length))
  }
  return null
}

export async function deleteS3ObjectByUrl(url: string | undefined | null): Promise<void> {
  if (!url) return
  const key = extractS3Key(url)
  if (!key) return

  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }))
  } catch (err) {
    console.error(`Failed to delete S3 object "${key}":`, err)
  }
}
