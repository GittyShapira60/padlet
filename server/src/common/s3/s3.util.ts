import { DeleteObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1'
export const S3_BUCKET = process.env.AWS_S3_BUCKET ?? ''
const SIGNED_URL_EXPIRY = Number(process.env.AWS_S3_SIGNED_URL_EXPIRY) || 3600

export const s3Client = new S3Client({ region: AWS_REGION })

// The bucket is kept private; every read goes through a time-limited signed URL
// rather than a hand-built https://bucket.s3.region.amazonaws.com/key link.
export function getSignedImageUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key })
  return getSignedUrl(s3Client, command, { expiresIn: SIGNED_URL_EXPIRY })
}

export async function deleteS3Object(key: string | undefined | null): Promise<void> {
  if (!key) return

  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }))
  } catch (err) {
    console.error(`Failed to delete S3 object "${key}":`, err)
  }
}
