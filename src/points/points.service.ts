import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedbackEntity } from 'src/feedbacks/entities/feedback.entity';
import { PointEntity } from './entities/points.entity';
import { CreatePointDto } from './dto/create.dto';
import { UserEntity } from 'src/users/entities/user.entity';

@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(PointEntity)
    private readonly pointRepository: Repository<PointEntity>,

    @InjectRepository(FeedbackEntity)
    private readonly feedbackRepository: Repository<FeedbackEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async create(
    createPointDto: CreatePointDto,
    userId: string,
  ): Promise<PointEntity> {
    try {
      const { points, feedbackId } = createPointDto;

      const user = await this.userRepository.findOneBy({ id: userId });
      if (!user) {
        throw new NotFoundException(`Пользователь с id=${userId} не найден`);
      }

      let feedback: FeedbackEntity | null = null;

      if (feedbackId) {
        feedback = await this.feedbackRepository.findOneBy({ id: feedbackId });
        if (!feedback) {
          throw new NotFoundException(
            `Обратная связь с id=${feedbackId} не найдена`,
          );
        }
      }

      const point = this.pointRepository.create({
        points,
        feedback,
        user,
      });

      return await this.pointRepository.save(point);
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Ошибка при создании оценки: ${error.message}`,
      );
    }
  }

  async findAll(): Promise<PointEntity[]> {
    try {
      return await this.pointRepository.find({
        relations: ['feedback', 'user'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Ошибка при получении оценок: ${error.message}`,
      );
    }
  }

  async deleteLast(): Promise<void> {
    try {
      const last = await this.pointRepository.findOne({
        where: {},
        order: { createdAt: 'DESC' },
      });

      if (!last) {
        throw new NotFoundException('Нет ни одной оценки для удаления');
      }

      await this.pointRepository.remove(last);
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Ошибка при удалении последней оценки: ${error.message}`,
      );
    }
  }
}
