import { Controller, Get, HttpCode, HttpStatus, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthTokenGuard } from './auth-token.guard';
import { AuthUserDto } from '../common/models/auth';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthTokenGuard)
  async login(@Req() req: any): Promise<AuthUserDto> {
    const idToken: string | undefined = req?.idToken;
    if (!idToken) throw new UnauthorizedException('Missing token');
    return this.authService.login(idToken);
  }

  @Get('me')
  @UseGuards(AuthTokenGuard)
  async me(@Req() req: any): Promise<AuthUserDto> {
    const idToken: string | undefined = req?.idToken;
    if (!idToken) throw new UnauthorizedException('Missing token');
    return this.authService.getMe(idToken);
  }
}


