import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto } from './dto/create.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    private jwtService: JwtService,
  ) {}

  async findAll() {
    try {
      const findAll = await this.usersRepository.find();
      if (!findAll) {
        throw new BadRequestException('Пользователи не найдены');
      }
      return findAll;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Ошибка при получение всех пользователей:', error);
      throw new InternalServerErrorException('Не удалось найти пользователей');
    }
  }

  async create(
    createUserDto: CreateUserDto,
  ): Promise<{ access_token: string }> {
    try {
      const existingUser = await this.findByLogin(createUserDto.login);
      if (existingUser) {
        throw new BadRequestException('Такой пользователь уже существует');
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(
        createUserDto.password,
        saltRounds,
      );

      const newUser = this.usersRepository.create({
        ...createUserDto,
        password: hashedPassword,
      });

      const savedUser = await this.usersRepository.save(newUser);

      const payload = {
        id: savedUser.id,
        login: savedUser.login,
        role: savedUser.role,
      };
      const token = await this.jwtService.signAsync(payload);

      return { access_token: token };
    } catch (error) {
      console.error('Ошибка при создании пользователя:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Не удалось создать пользователя');
    }
  }

  async delete(id: string) {
    try {
      const user = await this.usersRepository.findOneBy({ id });
      console.log(user, id)
      if (!user)
        throw new BadRequestException('Такой пользователь не существует!');

      await this.usersRepository.delete({ id: user.id });
      return { message: 'Пользователь успешно удалён' };
    } catch (error) {
      console.error('Ошибка при создании пользователя:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Не удалось удалить пользователя');
    }
  }

  async findByLogin(login: string) {
    try {
      return await this.usersRepository.findOneBy({ login });
    } catch (error) {
      console.error('Ошибка при поиске пользователя по логину:', error);
      throw new InternalServerErrorException('Не удалось найти пользователя');
    }
  }
}
