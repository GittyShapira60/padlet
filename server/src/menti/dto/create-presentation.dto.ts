import { IsOptional, IsString, MaxLength } from 'class-validator'

export class CreatePresentationDto {
  @IsString() @MaxLength(200) title: string
  @IsString() @IsOptional() @MaxLength(500) description?: string
}

export class UpdatePresentationDto {
  @IsString() @IsOptional() @MaxLength(200) title?: string
  @IsString() @IsOptional() @MaxLength(500) description?: string
  @IsOptional() anonymousMode?: boolean
}
