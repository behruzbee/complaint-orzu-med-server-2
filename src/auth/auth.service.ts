import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async validateUser(login: string, password: string) {
    const user = await this.usersService.findByLogin(login);
    if (!user) throw new UnauthorizedException('Неверный логин или пароль');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Неверный логин или пароль');

    return user;
  }

  async login(user: any) {
    const payload = { id: user.id, login: user.login, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
