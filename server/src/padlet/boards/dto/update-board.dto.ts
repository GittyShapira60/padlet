import { IsBoolean, IsEnum, IsIn, IsOptional, IsString } from 'class-validator'
import { BoardLayout } from '../../../common/enums'

export class UpdateBoardDto {
  @IsString()
  @IsOptional()
  title?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsString()
  @IsOptional()
  background?: string

  @IsEnum(BoardLayout)
  @IsOptional()
  layout?: BoardLayout

  @IsString()
  @IsOptional()
  coverImage?: string

  @IsString()
  @IsOptional()
  password?: string

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean

  @IsString()
  @IsIn(['ltr', 'rtl'])
  @IsOptional()
  timelineDirection?: string
}
