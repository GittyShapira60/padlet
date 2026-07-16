import { IsIn, IsOptional, IsString } from 'class-validator'

export class DuplicateBoardDto {
  @IsString()
  @IsOptional()
  title?: string

  @IsIn(['none', 'mine', 'all'])
  @IsOptional()
  posts_option?: 'none' | 'mine' | 'all'

  @IsIn(['keep', 'new', 'none'])
  @IsOptional()
  password_option?: 'keep' | 'new' | 'none'

  @IsIn(['keep', 'none'])
  @IsOptional()
  members_option?: 'keep' | 'none'

  @IsString()
  @IsOptional()
  custom_password?: string
}
