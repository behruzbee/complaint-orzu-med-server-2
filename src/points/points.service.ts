import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PointEntity } from './entities/points.entity';
import {
  Branches,
  CreatePointDto,
  PointValue,
  TargetName,
} from './dto/create.dto';
import { UserEntity } from 'src/users/entities/user.entity';
import { FeedbacksService } from 'src/feedbacks/feedbacks.service';
import { FeedbackEntity } from 'src/feedbacks/entities/feedback.entity';
import {
  PatientEntity,
  PatientStatus,
} from 'src/patients/entities/patient.entity';

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(
    @InjectRepository(PointEntity)
    private readonly pointsRepository: Repository<PointEntity>,

    @InjectRepository(FeedbackEntity)
    private readonly feedbackRepository: Repository<FeedbackEntity>,

    @InjectRepository(PatientEntity)
    private readonly patientRepository: Repository<PatientEntity>,

    private readonly feedbacksService: FeedbacksService,
  ) {}

  async create(
    createPointDto: CreatePointDto,
    userId: string,
    phoneNumber?: string,
  ): Promise<PointEntity> {
    try {
      const user = await this.pointsRepository.manager.findOne(UserEntity, {
        where: { id: userId },
      });


      if (!user) {
        throw new BadRequestException('Пользователь не найден');
      }

      let feedback: FeedbackEntity | null = null;
      if (createPointDto.feedback) {
        feedback = await this.feedbacksService.createFeedback(
          createPointDto.feedback,
          userId,
          createPointDto.branch,
          createPointDto.category,
        );
      }


      return await this.pointsRepository.save({
        ...createPointDto,
        user,
        feedback,
        phoneNumber: phoneNumber || createPointDto.phoneNumber,
      });
    } catch (error) {
      this.logger.error('Ошибка создания Point', error);
      throw new BadRequestException('Ошибка при создании точки');
    }
  }

  async createMany(
    createPointDtos: CreatePointDto[],
    userId: string,
    branch: Branches,
    phoneNumber: string,
  ): Promise<PointEntity[]> {
    try {
      const createdPoints: PointEntity[] = [];

      const MAX_POINTS = PointValue.FIVE;
      const categories = Object.values(TargetName);

      const dtoMap = new Map<string, CreatePointDto>();
      for (const dto of createPointDtos) {
        dtoMap.set(dto.category, dto);
      }

      for (const category of categories) {
        let dto = dtoMap.get(category);

        if (!dto) {
          if (!branch) {
            throw new BadRequestException(
              'Не указан филиал для заполнения недостающих точек',
            );
          }

          dto = {
            category,
            points: MAX_POINTS,
            branch,
            phoneNumber,
          };
        }

        const created = await this.create(dto, userId, phoneNumber);
        createdPoints.push(created);
      }

      if (phoneNumber) {
        const patient = await this.patientRepository.findOneBy({
          phoneNumber: phoneNumber,
          status: PatientStatus.REGULAR,
        });

        if (patient) {
          await this.patientRepository.delete({
            phoneNumber: phoneNumber,
            status: PatientStatus.NEW,
          });
        }

        if (!patient) {
          await this.patientRepository.update(
            {
              phoneNumber: phoneNumber,
              status: PatientStatus.NEW,
            },
            { status: PatientStatus.REGULAR },
          );
        }
      }

      return createdPoints;
    } catch (error) {
      this.logger.error('Ошибка создания множества точек', error);
      throw new BadRequestException('Ошибка при создании множества точек');
    }
  }

  async deleteAll(): Promise<void> {
    try {
      await this.pointsRepository.clear();
      this.logger.log('Все точки успешно удалены');
    } catch (error) {
      this.logger.error('Ошибка удаления всех точек', error);
      throw new BadRequestException('Ошибка при удалении всех точек');
    }
  }

  async findAll(): Promise<PointEntity[]> {
    try {
      return await this.pointsRepository.find({
        relations: ['feedback', 'user'],
      });
    } catch (error) {
      this.logger.error('Ошибка получения всех точек', error);
      throw new BadRequestException('Ошибка при получении точек');
    }
  }

  async findWithFeedback(): Promise<PointEntity[]> {
    try {
      return await this.pointsRepository.find({
        where: {
          feedback: In(
            await this.feedbackRepository
              .find()
              .then((fbs) => fbs.map((fb) => fb.id)),
          ),
        },
        relations: ['feedback', 'user'],
      });
    } catch (error) {
      this.logger.error('Ошибка получения точек с feedback', error);
      throw new BadRequestException('Ошибка при получении точек с отзывами');
    }
  }

  async removeLastFivePoints(): Promise<void> {
    try {
      const lastFivePoints = await this.pointsRepository.find({
        order: { createdAt: 'DESC' },
        take: 5,
        relations: ['feedback'],
      });

      for (const point of lastFivePoints) {
        if (point.feedback) {
          await this.feedbackRepository.delete(point.feedback.id);
          this.logger.log(
            `Удалён feedback с id ${point.feedback.id} для point ${point.id}`,
          );
        }
      }

      await this.pointsRepository.remove(lastFivePoints);
      this.logger.log('Удалены последние 5 точек');
    } catch (error) {
      this.logger.error('Ошибка удаления последних 5 точек', error);
      throw new BadRequestException('Ошибка при удалении точек');
    }
  }

  async findOne(id: string): Promise<PointEntity> {
    try {
      const point = await this.pointsRepository.findOne({
        where: { id },
        relations: ['feedback', 'user'],
      });
      if (!point) throw new NotFoundException('Точка не найдена');
      return point;
    } catch (error) {
      this.logger.error(`Ошибка получения точки по id ${id}`, error);
      throw new BadRequestException('Ошибка при получении точки');
    }
  }
}
