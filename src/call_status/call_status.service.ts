import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateCallStatusDto } from './dto/create.dto';
import { Repository } from 'typeorm';
import { CallStatusEntity } from './entities/call_status.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from 'src/users/entities/user.entity';

@Injectable()
export class CallStatusService {
  constructor(
    @InjectRepository(CallStatusEntity)
    private readonly callStatusRepository: Repository<CallStatusEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async getAll(): Promise<CallStatusEntity[]> {
    try {
      return await this.callStatusRepository.find({
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Ошибка при получении статусов звонков',
      );
    }
  }

  async create(
    callStatusDto: CreateCallStatusDto,
    userId: string,
  ): Promise<CallStatusEntity> {
    try {
      const user = await this.userRepository.findOneBy({ id: userId });
      const newStatus = this.callStatusRepository.create(callStatusDto);
      return await this.callStatusRepository.save({
        ...newStatus,
        user: user as UserEntity,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Ошибка при создании статуса звонка',
      );
    }
  }

  async deleteLast(): Promise<{ message: string }> {
    try {
      const lastStatus = await this.callStatusRepository.findOne({
        where: {},
        order: { createdAt: 'DESC' },
      });

      if (!lastStatus) {
        throw new NotFoundException('Нет записей для удаления');
      }

      await this.callStatusRepository.delete({ id: lastStatus.id });

      return { message: 'Последний статус звонка успешно удалён' };
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Ошибка при удалении последнего статуса звонка',
      );
    }
  }
}
