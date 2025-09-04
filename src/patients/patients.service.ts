import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientEntity, PatientStatus } from './entities/patient.entity';
import * as XLSX from 'xlsx';
import stringSimilarity from 'string-similarity';
import { CreatePatientDto } from './dto/create.dto';
import { Branches } from 'src/points/dto/create.dto';

interface ImportError {
  line: number;
  reason: string;
}

interface ImportReport {
  totalRows: number;
  imported: number;
  skippedDuplicates: number;
  errors: ImportError[];
}

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(PatientEntity)
    private readonly patientRepository: Repository<PatientEntity>,
  ) {}

  // 📌 Импорт из Excel
  async importFromExcel(fileBuffer: Buffer): Promise<ImportReport> {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: '',
        raw: false,
      });

      const errors: ImportError[] = [];
      const toCreate: PatientEntity[] = [];

      let currentCheckoutISO: string | null = null;
      let skippedDuplicates = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as any;
        const lineNumber = i + 2;

        // 📌 Проверка строки-даты
        const rawValues = Object.values(row).map((v) => String(v).trim());
        const dateCandidate = rawValues.find((val) =>
          /^\d{1,2}[,.\-/]\d{1,2}[,.\-/]\d{4}$/.test(val),
        );
        if (dateCandidate) {
          const [d, m, y] = dateCandidate.replace(/,/g, '.').split(/[.\-/]/);
          currentCheckoutISO = new Date(+y, +m - 1, +d).toISOString();
          continue;
        }

        const fullName = String(
          row['Имя и Фамилия'] || row['Фамилия Имя'] || '',
        ).trim();
        const phoneNumber = String(
          row['Номер телефона'] || row['Телефон Номер'] || '',
        ).trim();
        const branchInput = String(row['Филиал'] || '').trim();

        if (!fullName && !phoneNumber && !branchInput) continue;

        if (!fullName || !phoneNumber) {
          errors.push({
            line: lineNumber,
            reason: 'Отсутствует имя или номер телефона',
          });
          continue;
        }

        // 📌 Имя / фамилия
        const nameParts = fullName.split(/\s+/);
        const firstName = nameParts[0] || null;
        const lastName = nameParts[1] || null;

        // 📌 Телефон
        const normalizedPhone = this.normalizePhone(phoneNumber);
        if (!normalizedPhone.valid) {
          errors.push({
            line: lineNumber,
            reason: `Некорректный номер телефона: "${phoneNumber}"`,
          });
          continue;
        }

        // 📌 Филиал (поиск ближайшего совпадения)
        let branch: string;
        try {
          branch = this.normalizeBranch(branchInput, lineNumber);
        } catch (err: any) {
          errors.push({ line: lineNumber, reason: err.message });
          continue;
        }

        const exists = await this.patientRepository.findOne({
          where: { phoneNumber: normalizedPhone.value, status: PatientStatus.NEW },
        });
        if (exists) {
          skippedDuplicates++;
          continue;
        }

        const entity: PatientEntity = this.patientRepository.create({
          firstName: firstName || branch,
          lastName: lastName || branch,
          phoneNumber: normalizedPhone.value,
          branch,
          status: PatientStatus.NEW,
          checkOutTime: currentCheckoutISO ?? '',
        });

        toCreate.push(entity);
      }

      if (toCreate.length > 0) {
        await this.patientRepository.save(toCreate);
      }

      const report: ImportReport = {
        totalRows: rows.length,
        imported: toCreate.length,
        skippedDuplicates,
        errors,
      };

      if (report.imported === 0 && errors.length > 0) {
        throw new BadRequestException({
          message: 'Импорт не выполнен. Обнаружены ошибки.',
          errors,
        });
      }

      return report;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException(
        `Ошибка при импорте: ${err.message}`,
      );
    }
  }

  // 📌 Поиск ближайшего филиала
  normalizeBranch(inputBranch: string, lineNumber: number): string {
    if (!inputBranch) {
      throw new BadRequestException(
        `Ошибка в строке ${lineNumber}: филиал не указан`,
      );
    }

    const branchList = Object.values(Branches).map((b) => String(b));

    // ищем ближайшие совпадения
    const matches = stringSimilarity.findBestMatch(
      inputBranch.toUpperCase(),
      branchList.map((b) => b.toUpperCase()),
    );

    const best = matches.bestMatch;
    const bestBranch = branchList[matches.bestMatchIndex];

    if (best.rating < 0.4) {
      throw new BadRequestException(
        `Ошибка в строке ${lineNumber}: филиал "${inputBranch}" не найден. Возможно, вы имели в виду: ${branchList
          .slice(0, 3)
          .join(', ')}`,
      );
    }

    return bestBranch;
  }

  // 📌 Нормализация телефона
  normalizePhone(phone: string): { valid: boolean; value: string } {
    let value = phone.replace(/\D/g, '');

    if (!value) return { valid: false, value: phone };

    // Казахстан: 8 → 7
    if (value.startsWith('8') && value.length === 11) {
      value = '7' + value.slice(1);
    }

    const validPrefixes = ['998', '7', '375', '996', '992', '993', '994'];
    if (!validPrefixes.some((p) => value.startsWith(p))) {
      return { valid: false, value: phone };
    }

    return { valid: true, value: '+' + value }; // всегда добавляем "+"
  }

  // 📌 Ручное добавление
  async addPatientManually(
    patientDto: CreatePatientDto,
  ): Promise<PatientEntity> {
    const { firstName, lastName, phoneNumber, branch } = patientDto;

    const patient = this.patientRepository.create({
      firstName,
      lastName,
      phoneNumber: this.normalizePhone(phoneNumber).value,
      branch: this.normalizeBranch(branch, 0),
      status: PatientStatus.NEW,
    });

    return this.patientRepository.save(patient);
  }

  async getPatientsByStatus(status: PatientStatus) {
    return this.patientRepository.find({
      where: { status },
      relations: [
        'feedbacks',
        'feedbacks.messages',
        'feedbacks.voices',
        'feedbacks.point',
        'feedbacks.user',
      ],
    });
  }

  async getPatientById(id: string) {
    const patient = await this.patientRepository.findOne({
      where: { id },
      relations: [
        'feedbacks',
        'feedbacks.messages',
        'feedbacks.voices',
        'feedbacks.point',
        'feedbacks.user',
        'call_statuses',
        'points',
      ],
    });

    if (!patient) {
      throw new NotFoundException(`Пациент с id=${id} не найден`);
    }

    return patient;
  }

  async deletePatient(id: string): Promise<{ deleted: boolean }> {
    const result = await this.patientRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Пациент с id=${id} не найден`);
    }
    return { deleted: true };
  }
}
