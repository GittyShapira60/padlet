import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator'

export class UpdateSessionDto {
  @IsInt() @Min(0) @IsOptional() currentSlideIndex?: number
  @IsBoolean() @IsOptional() isActive?: boolean
  @IsBoolean() @IsOptional() isVotingOpen?: boolean
  @IsBoolean() @IsOptional() resultsVisible?: boolean
  @IsBoolean() @IsOptional() selfPaced?: boolean
}
