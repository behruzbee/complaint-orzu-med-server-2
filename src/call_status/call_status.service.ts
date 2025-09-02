import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { CreateCallStatusDto } from './dto/create.dto';
import { EntityManager, Repository } from 'typeorm';
import { CallStatusEntity } from './entities/call_status.entity';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import {
  PatientEntity,
  PatientStatus,
} from 'src/patients/entities/patient.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class CallStatusService {
  private readonly logger = new Logger(CallStatusService.name);

  constructor(
    @InjectRepository(CallStatusEntity)
    private readonly callStatusRepository: Repository<CallStatusEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getAll() {
    try {
      const callStatuses = await this.callStatusRepository.find({
        relations: ['user', 'patient'],
        order: { createdAt: 'DESC' },
      });
      return callStatuses;
    } catch (error) {
      this.logger.error('Ошибка при получении статусов звонков', error);
      throw new InternalServerErrorException(
        'Ошибка при получении статусов звонков',
      );
    }
  }

  private async getUserOrThrow(userId: string) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      throw new NotFoundException('Пользователь не найден');
    }
    return user;
  }

  private async getOrCreatePatientInTx(
    manager: EntityManager,
    phoneNumber: string,
    branch: string,
  ) {
    if (!phoneNumber) return null;

    // Prefer REGULAR patient
    let patient = await manager.findOne(PatientEntity, {
      where: { phoneNumber, status: PatientStatus.REGULAR },
    });

    if (patient) {
      if (patient.branch !== branch) {
        patient.branch = branch;
        patient = await manager.save(patient);
      }
      return patient;
    }

    await manager.delete(PatientEntity, {
      phoneNumber,
      status: PatientStatus.NEW,
    });

    patient = manager.create(PatientEntity, {
      phoneNumber,
      status: PatientStatus.REGULAR,
    });
    return await manager.save(patient);
  }

  async create(
    callStatusDto: CreateCallStatusDto,
    userId: string,
  ): Promise<CallStatusEntity> {
    const { phoneNumber, branch } = callStatusDto;
    return await this.dataSource.transaction(async (manager) => {
      try {
        const user = await this.getUserOrThrow(userId);

        const newStatus = manager.create(CallStatusEntity, {
          status: callStatusDto.status,
          phoneNumber,
          branch,
        });

        const patient = await this.getOrCreatePatientInTx(
          manager,
          phoneNumber,
          branch,
        );
        newStatus.patient = patient || null;
        newStatus.user = user;

        return await manager.save(newStatus);
      } catch (error) {
        this.logger.error('Ошибка при создании статуса звонка', error);
        throw new InternalServerErrorException(
          'Ошибка при создании статуса звонка',
        );
      }
    });
  }

  async deleteLast(): Promise<{ message: string }> {
    try {
      const lastStatus = await this.callStatusRepository.findOne({
        order: { createdAt: 'DESC' },
        relations: ['user', 'patient'],
      });

      if (!lastStatus) {
        throw new NotFoundException('Нет записей для удаления');
      }

      await this.callStatusRepository.remove(lastStatus);
      this.logger.log(`Удалён call status ${lastStatus.id}`);
      return { message: 'Последний статус звонка успешно удалён' };
    } catch (error) {
      this.logger.error('Ошибка при удалении последнего статуса звонка', error);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Ошибка при удалении последнего статуса звонка',
      );
    }
  }
}
