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

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(PatientEntity)
    private readonly patientRepository: Repository<PatientEntity>,
  ) {}

  // 📌 Импорт из Excel
  async importFromExcel(fileBuffer: Buffer): Promise<{ imported: number }> {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: '',
      });

      let importedCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as any;
        const lineNumber = i + 2; // 1 — заголовки

        const fullName = String(row['Фамилия Имя'] || '').trim();
        const phoneNumber = String(row['Телефон Номер'] || '').trim();
        const branchInput = String(row['Филиал'] || '').trim();
        const branch = this.normalizeBranch(branchInput, lineNumber);

        if (!fullName || !phoneNumber) {
          throw new BadRequestException(
            `Ошибка в строке ${lineNumber}: отсутствует имя или номер телефона`,
          );
        }

        const nameParts = fullName.split(' ');
        if (nameParts.length < 2) {
          throw new BadRequestException(
            `Ошибка в строке ${lineNumber}: ФИО должно содержать имя и фамилию`,
          );
        }

        const [firstName, lastName] = nameParts;
        const patient = this.patientRepository.create({
          firstName,
          lastName,
          phoneNumber,
          branch,
          status: PatientStatus.NEW,
        });
        await this.patientRepository.save(patient);
        importedCount++;
      }

      return { imported: importedCount };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException(
        `Ошибка при импорте: ${err.message}`,
      );
    }
  }

  normalizeBranch(inputBranch: string, lineNumber: number): string {
    const branchList = Object.values(Branches);
    const { bestMatch, bestMatchIndex } = stringSimilarity.findBestMatch(
      inputBranch.toUpperCase(),
      branchList,
    );

    if (bestMatch.rating < 0.6) {
      throw new BadRequestException(
        `Ошибка в строке ${lineNumber}: филиал "${inputBranch}" не найден`,
      );
    }

    return branchList[bestMatchIndex];
  }

  async addPatientManually(
    patientDto: CreatePatientDto,
  ): Promise<PatientEntity> {
    const { firstName, lastName, phoneNumber, branch } = patientDto;

    const patient = this.patientRepository.create({
      firstName,
      lastName,
      phoneNumber,
      branch,
      status: PatientStatus.NEW,
    });

    return await this.patientRepository.save(patient);
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
