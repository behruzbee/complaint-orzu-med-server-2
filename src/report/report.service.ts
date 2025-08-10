import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import {
  PatientEntity,
  PatientStatus,
} from 'src/patients/entities/patient.entity';
import { Branches, PointValue, TargetName } from 'src/points/dto/create.dto';
import {
  CallStatusEntity,
  CallStatusType,
} from 'src/call_status/entities/call_status.entity';
import { PointEntity } from 'src/points/entities/points.entity';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(PatientEntity)
    private readonly patientRepo: Repository<PatientEntity>,
    @InjectRepository(CallStatusEntity)
    private readonly callStatusRepo: Repository<CallStatusEntity>,
    @InjectRepository(PointEntity)
    private readonly pointRepo: Repository<PointEntity>,
  ) {}

  async generateReport(startDate: Date, endDate: Date) {
    // Все филиалы по порядку
    const branches = Object.values(Branches);

    // Готовим Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Отчёт');

    // Заголовки
    sheet.addRow([
      '№',
      'Филиал',
      'Количество пациентов',
      'Обратный звонок (кол-во)',
      'Обратный звонок (%)',
      'Не дозвонились (кол-во)',
      'Не дозвонились (%)',
      'NO_ANSWER',
      'WRONG_NUMBER',
      'NO_CONNECTION',
      'ANSWERED',
      'Баллы (Врач)',
      'Баллы (Хамшира)',
      'Баллы (Тозалик)',
      'Баллы (Ошхона)',
      'Баллы (Регистратура)',
      'Баллы 2',
      'Баллы 3',
      'Баллы 4',
      'Баллы 5',
      'Баллы % (2)',
      'Баллы % (3)',
      'Баллы % (4)',
      'Баллы % (5)',
    ]);

    let index = 1;

    for (const branch of branches) {
      // === Кол-во пациентов ===
      const totalPatients = await this.patientRepo.count({
        where: { branch, createdAt: this.between(startDate, endDate) },
      });

      // === Обратные звонки ===
      const totalCalls = await this.callStatusRepo.count({
        where: {
          branch,
          createdAt: this.between(startDate, endDate),
        },
      });

      const answeredCalls = await this.callStatusRepo.count({
        where: {
          status: CallStatusType.ANSWERED,
          branch,
          createdAt: this.between(startDate, endDate),
        },
      });

      const unansweredCalls = totalPatients - answeredCalls;

      const percentAnswered = totalPatients
        ? ((answeredCalls / totalPatients) * 100).toFixed(2)
        : 0;

      const percentUnanswered = totalPatients
        ? ((unansweredCalls / totalPatients) * 100).toFixed(2)
        : 0;

      // === Детализация по статусам звонков ===
      const callStatusCounts: Record<CallStatusType, number> = {
        [CallStatusType.NO_ANSWER]: 0,
        [CallStatusType.WRONG_NUMBER]: 0,
        [CallStatusType.NO_CONNECTION]: 0,
        [CallStatusType.ANSWERED]: 0,
      };

      for (const status of Object.values(CallStatusType)) {
        callStatusCounts[status] = await this.callStatusRepo.count({
          where: {
            status,
            branch,
            createdAt: this.between(startDate, endDate),
          },
        });
      }

      // === Баллы по категориям ===
      const pointsByCategory: Record<TargetName, number> = {
        [TargetName.DOCTORS]: 0,
        [TargetName.NURSES]: 0,
        [TargetName.CLEANING]: 0,
        [TargetName.KITCHEN]: 0,
        [TargetName.RECEPTION]: 0,
      };

      const pointsByValue: Record<PointValue, number> = {
        [PointValue.TWO]: 0,
        [PointValue.THREE]: 0,
        [PointValue.FOUR]: 0,
        [PointValue.FIVE]: 0,
      };

      const pointEntities = await this.pointRepo.find({
        where: { branch, createdAt: this.between(startDate, endDate) },
      });

      for (const point of pointEntities) {
        pointsByCategory[point.category]++;
        pointsByValue[point.points]++;
      }

      const totalPoints = pointEntities.length;
      const pointsPercent: Record<PointValue, string> = {
        [PointValue.TWO]: totalPoints
          ? ((pointsByValue[PointValue.TWO] / totalPoints) * 100).toFixed(2)
          : '0',
        [PointValue.THREE]: totalPoints
          ? ((pointsByValue[PointValue.THREE] / totalPoints) * 100).toFixed(2)
          : '0',
        [PointValue.FOUR]: totalPoints
          ? ((pointsByValue[PointValue.FOUR] / totalPoints) * 100).toFixed(2)
          : '0',
        [PointValue.FIVE]: totalPoints
          ? ((pointsByValue[PointValue.FIVE] / totalPoints) * 100).toFixed(2)
          : '0',
      };

      sheet.addRow([
        index++,
        branch,
        totalPatients,
        answeredCalls,
        percentAnswered,
        unansweredCalls,
        percentUnanswered,
        callStatusCounts[CallStatusType.NO_ANSWER],
        callStatusCounts[CallStatusType.WRONG_NUMBER],
        callStatusCounts[CallStatusType.NO_CONNECTION],
        callStatusCounts[CallStatusType.ANSWERED],
        pointsByCategory[TargetName.DOCTORS],
        pointsByCategory[TargetName.NURSES],
        pointsByCategory[TargetName.CLEANING],
        pointsByCategory[TargetName.KITCHEN],
        pointsByCategory[TargetName.RECEPTION],
        pointsByValue[PointValue.TWO],
        pointsByValue[PointValue.THREE],
        pointsByValue[PointValue.FOUR],
        pointsByValue[PointValue.FIVE],
        pointsPercent[PointValue.TWO],
        pointsPercent[PointValue.THREE],
        pointsPercent[PointValue.FOUR],
        pointsPercent[PointValue.FIVE],
      ]);
    }

    // Генерация файла
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  private between(start: Date, end: Date) {
    return { $gte: start, $lte: end } as any; // для TypeORM нужно будет заменить на Between()
  }
}
