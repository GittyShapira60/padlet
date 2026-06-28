import { IsEnum, IsOptional, IsString } from 'class-validator'
import { BoardLayout } from '../../../common/enums'

export class CreateBoardDto {
  @IsString()
  title: string

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
  password?: string
}
