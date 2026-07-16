import { IsObject, IsOptional, IsString } from 'class-validator'

export class SubmitResponseDto {
  @IsString() slideId: string
  @IsObject() answer: Record<string, unknown>
  @IsString() @IsOptional() respondent?: string
}
