import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PointEntity } from './entities/points.entity';
import {
  CreateManyPointsDto,
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

    private readonly feedbacksService: FeedbacksService,

    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  private async getUserOrThrow(userId: string) {
    const user = await this.pointsRepository.manager.findOne(UserEntity, {
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user;
  }

  private async getOrCreateRegularPatient(
    em: Repository<PatientEntity> | any,
    phoneNumber: string,
    branch?: string,
  ) {
    let patient = await em.findOne(PatientEntity, {
      where: { phoneNumber, status: PatientStatus.REGULAR },
    });

    if (!patient) {
      const existingNew = await em.findOne(PatientEntity, {
        where: { phoneNumber, status: PatientStatus.NEW },
      });

      if (existingNew) {
        await em.update(PatientEntity, existingNew.id, {
          status: PatientStatus.REGULAR,
          ...(branch ? { branch } : {}),
        });
        patient = await em.findOne(PatientEntity, {
          where: { id: existingNew.id },
        });
      } else {
        patient = em.create(PatientEntity, {
          phoneNumber,
          status: PatientStatus.REGULAR,
          ...(branch ? { branch } : {}),
        });
        patient = await em.save(patient);
      }
    } else if (branch && patient.branch !== branch) {
      await em.update(PatientEntity, patient.id, { branch });
      patient.branch = branch as any;
    }

    return patient;
  }

  async create(
    dto: CreatePointDto,
    userId: string,
    phoneNumber: string,
  ): Promise<PointEntity> {
    return await this.dataSource.transaction(async (manager) => {
      const user = await this.getUserOrThrow(userId);
      const patient = await this.getOrCreateRegularPatient(
        manager,
        phoneNumber,
        dto.branch,
      );

      let feedback: FeedbackEntity | null = null;
      if (dto.feedback) {
        feedback = await this.feedbacksService.createFeedback(
          dto.feedback,
          userId,
          manager,
        );
      }

      const point = manager.create(PointEntity, {
        ...dto,
        user,
        patient,
        feedback,
      });

      return await manager.save(point);
    });
  }

  async createMany(
    { branch, phoneNumber, points }: CreateManyPointsDto,
    userId: string,
  ): Promise<PointEntity[]> {
    return await this.dataSource.transaction(async (manager) => {
      const user = await this.getUserOrThrow(userId);
      const patient = await this.getOrCreateRegularPatient(
        manager,
        phoneNumber,
        branch,
      );

      const MAX_POINTS = PointValue.FIVE;
      const categories = Object.values(TargetName);
      const map = new Map<string, CreatePointDto>();
      for (const p of points || []) map.set(p.category, p);

      // fill missing categories with default 5
      const completeDtos: CreatePointDto[] = categories.map(
        (category) =>
          map.get(category) ||
          ({
            category: category as TargetName,
            points: MAX_POINTS,
            branch,
          } as CreatePointDto),
      );

      // Optionally create feedbacks per DTO (only when provided)
      const feedbacksByCategory = new Map<string, FeedbackEntity>();
      for (const d of completeDtos) {
        if (d.feedback) {
          const fb = await this.feedbacksService.createFeedback(
            d.feedback,
            userId,
            manager,
          );
          feedbacksByCategory.set(d.category, fb);
        }
      }

      const entities = completeDtos.map((d) =>
        manager.create(PointEntity, {
          ...d,
          user,
          patient,
          feedback: feedbacksByCategory.get(d.category) || null,
        }),
      );

      return await manager.save(PointEntity, entities);
    });
  }

  async deleteAll(): Promise<void> {
    try {
      await this.pointsRepository.clear();
      this.logger.log('Все точки успешно удалены');
    } catch (e) {
      this.logger.error('Ошибка удаления всех точек', e?.message || e);
      throw new InternalServerErrorException('Ошибка при удалении всех точек');
    }
  }

  async findAll(): Promise<PointEntity[]> {
    try {
      return await this.pointsRepository.find({
        relations: ['feedback', 'user', 'patient'],
      });
    } catch (e) {
      this.logger.error('Ошибка получения всех точек', e?.message || e);
      throw new InternalServerErrorException('Ошибка при получении точек');
    }
  }

  async removeLastFivePoints(): Promise<void> {
    try {
      const lastFive = await this.pointsRepository.find({
        order: { createdAt: 'DESC' },
        take: 5,
      });
      if (!lastFive.length) return;
      await this.pointsRepository.remove(lastFive); // feedback is kept or nulled based on relation onDelete
      this.logger.log('Удалены последние 5 точек');
    } catch (e) {
      this.logger.error('Ошибка удаления последних 5 точек', e?.message || e);
      throw new InternalServerErrorException('Ошибка при удалении точек');
    }
  }
}
