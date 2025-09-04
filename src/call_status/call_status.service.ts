import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { CreateCallStatusDto } from './dto/create.dto';
import { EntityManager, Repository, DataSource } from 'typeorm';
import { CallStatusEntity } from './entities/call_status.entity';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import {
  PatientEntity,
  PatientStatus,
} from 'src/patients/entities/patient.entity';

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
      return await this.callStatusRepository.find({
        relations: ['user', 'patient'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error('Ошибка при получении статусов звонков', error.stack);
      throw new InternalServerErrorException(
        'Ошибка при получении статусов звонков',
      );
    }
  }

  private async getUserOrThrow(userId: string): Promise<UserEntity> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      this.logger.warn(`Пользователь не найден: ${userId}`);
      throw new NotFoundException('Пользователь не найден');
    }
    return user;
  }

  /**
   * 📌 Поиск или создание пациента внутри транзакции
   */
  private async getOrCreatePatientInTx(
    manager: EntityManager,
    phoneNumber: string,
    branch: string,
  ): Promise<PatientEntity | null> {
    if (!phoneNumber) return null;

    let patient = await manager.findOne(PatientEntity, {
      where: { phoneNumber },
    });

    console.log(patient)
    console.log(phoneNumber)

    if (patient) {
      if (patient.status === PatientStatus.NEW) {
        patient.status = PatientStatus.REGULAR;
      }
      if (patient.branch !== branch) {
        patient.branch = branch;
      }
      return await manager.save(patient);
    }

    patient = manager.create(PatientEntity, {
      phoneNumber,
      branch,
      status: PatientStatus.REGULAR,
    });


    return await manager.save(patient);
  }

  async create(
    callStatusDto: CreateCallStatusDto,
    userId: string,
  ): Promise<CallStatusEntity> {
    const { phoneNumber, branch, status } = callStatusDto;

    return await this.dataSource.transaction(async (manager) => {
      try {
        const user = await this.getUserOrThrow(userId);

        const patient = await this.getOrCreatePatientInTx(
          manager,
          phoneNumber,
          branch,
        );

        const newStatus = manager.create(CallStatusEntity, {
          status,
          phoneNumber,
          branch,
          user,
          patient,
        });

        const saved = await manager.save(newStatus);

        this.logger.log(
          `Создан новый call status ${saved.id} для пациента ${phoneNumber}`,
        );

        return saved;
      } catch (error) {
        this.logger.error('Ошибка при создании статуса звонка', error.stack);
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
      this.logger.error(
        'Ошибка при удалении последнего статуса звонка',
        error.stack,
      );
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Ошибка при удалении последнего статуса звонка',
      );
    }
  }
}
