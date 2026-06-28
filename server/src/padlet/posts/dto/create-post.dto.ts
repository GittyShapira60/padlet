import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'
import { PostType } from '../../../common/enums'

export class CreatePostDto {
  @IsEnum(PostType)
  @IsOptional()
  type?: PostType

  @IsString()
  content: string

  @IsString()
  @IsOptional()
  color?: string

  @IsNumber()
  @IsOptional()
  x?: number

  @IsNumber()
  @IsOptional()
  y?: number

  @IsNumber()
  @IsOptional()
  width?: number

  @IsString()
  @IsOptional()
  image_url?: string

  @IsString()
  @IsOptional()
  link_url?: string

  @IsString()
  @IsOptional()
  link_title?: string

  @IsString()
  @IsOptional()
  link_description?: string

  @IsString()
  @IsOptional()
  link_image?: string

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  poll_options?: string[]

  @IsString()
  @IsOptional()
  shape?: string
}
