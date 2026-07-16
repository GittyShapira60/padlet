import { IsIn, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator'
import { SlideType } from '../entities/menti-slide.entity'

export class CreateSlideDto {
  @IsIn(Object.values(SlideType)) type: SlideType
  @IsString() @IsOptional() question?: string
  @IsObject() @IsOptional() config?: Record<string, unknown>
  @IsInt() @Min(0) @IsOptional() insertAtIndex?: number
}

export class UpdateSlideDto {
  @IsString() @IsOptional() question?: string
  @IsObject() @IsOptional() config?: Record<string, unknown>
}
