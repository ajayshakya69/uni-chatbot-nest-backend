// dev-profile.dto.ts
import {
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
  IsDate,
  IsEmail,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { USER_ROLE } from 'src/core/constants/user.constants';

export class CreateUserDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'a7b5c92e-9a44-4b6c-8f83-1234567890ab',
    description: 'Supabase auth user ID',
  })
  @IsUUID()
  supabase_id: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.png' })
  @IsOptional()
  @IsString()
  profile_picture?: string;

  @ApiPropertyOptional({ enum: USER_ROLE, example: USER_ROLE.AUTHENTICATED })
  @IsOptional()
  @IsEnum(USER_ROLE)
  role?: USER_ROLE;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.png' })
  @IsOptional()
  @IsString()
  profile_picture?: string;

  @ApiPropertyOptional({ enum: USER_ROLE, example: USER_ROLE.DEVELOPER })
  @IsOptional()
  @IsEnum(USER_ROLE)
  role?: USER_ROLE;
}

export class IdDto {
  @ApiProperty({ example: 'a7b5c92e-9a44-4b6c-8f83-1234567890ab' })
  @IsUUID()
  id: string;
}

export class UserIdDto {
  @ApiProperty({ example: 'a7b5c92e-9a44-4b6c-8f83-1234567890ab' })
  @IsUUID()
  user_id: string;
}

export class OrgIdDto {
  @ApiProperty({ example: 'a7b5c92e-9a44-4b6c-8f83-1234567890ab' })
  @IsUUID()
  org_id: string;
}

export class EmailDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

export class SupabaseIdDto {
  @ApiProperty({ example: 'a7b5c92e-9a44-4b6c-8f83-1234567890ab' })
  @IsUUID()
  supabase_id: string;
}

export class CreateClassDto {
  @ApiProperty({
    description: 'Title of the class',
    example: 'Mathematics 101',
  })
  title: string;

  @ApiProperty({
    description: 'Optional description of the class',
    example: 'This class covers basic algebra and geometry concepts.',
    required: false,
  })
  description?: string;
}
