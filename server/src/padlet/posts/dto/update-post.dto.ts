import { IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdatePostDto {
  @IsString()
  @IsOptional()
  content?: string

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
  imageUrl?: string

  @IsString()
  @IsOptional()
  shape?: string
}
