import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PatientEntity, PatientStatus } from './entities/patient.entity';
import * as XLSX from 'xlsx';
import stringSimilarity from 'string-similarity';
import { CreatePatientDto } from './dto/create.dto';
import { Branches } from 'src/points/dto/create.dto';

type ImportReport = {
  totalRows: number;
  detectedHeaderAt: number | null;
  imported: number;
  skippedDuplicates: number;
  errors: Array<{ line: number; reason: string }>;
};

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(PatientEntity)
    private readonly patientRepository: Repository<PatientEntity>,
  ) {}

  /**
   * 📌 Импорт из Excel c «пока-йоке»
   * - Поддерживает строки-даты (12,08,2025 / 12.08.2025 / 12/08/2025 / excel-serial)
   * - Телефон: только полные номера; 8*********** → 7*********** (KZ)
   * - Фамилия не обязательна (разбор «Имя и Фамилия»)
   * - Филиал ищется по best match среди Branches
   * - Ошибки собираются, импорт продолжается
   */
  async importFromExcel(fileBuffer: Buffer): Promise<ImportReport> {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const rows: any[][] = XLSX.utils.sheet_to_json(
        workbook.Sheets[sheetName],
        {
          header: 1,
          raw: true,
          defval: '',
        },
      );

      if (!rows.length) {
        throw new BadRequestException('Пустой файл');
      }

      // 1) Найти строку с заголовками и индексы столбцов
      const headerIndex = this.findHeaderRowIndex(rows);
      if (headerIndex === -1) {
        throw new BadRequestException(
          'Не найдена строка с заголовками. Ожидаются колонки: "Имя", "Телефон", "Филиал" (допустимы вариации вроде "Имя и Фамилия", "Номер телефона", и т.п.).',
        );
      }

      const headerRow = rows[headerIndex].map((v) => String(v).trim());
      const colIdx = this.mapHeaderIndices(headerRow);

      // 2) Основной проход: поддержка строк-дата
      let currentCheckoutISO: string | null = null;
      const errors: ImportReport['errors'] = [];
      const toCreate: PatientEntity[] = [];
      const seenInFile = new Set<string>(); // для дедупликации внутри файла

      for (let i = headerIndex + 1; i < rows.length; i++) {
        const lineNumber = i + 1; // для человека (1-based)
        const row = rows[i];

        // Пропускаем полностью пустые строки
        if (!row || row.every((c) => String(c).trim() === '')) continue;

        // Если это строка-дата (разделитель)
        if (this.isDateSeparatorRow(row)) {
          const parsed = this.parseAsISODate(row);
          if (parsed) {
            currentCheckoutISO = parsed;
            continue; // не пациент, просто разделитель
          }
        }

        // Собираем значения по колонкам
        const rawName =
          colIdx.name !== -1 ? String(row[colIdx.name] ?? '').trim() : '';
        const rawPhone =
          colIdx.phone !== -1 ? String(row[colIdx.phone] ?? '').trim() : '';
        const rawBranch =
          colIdx.branch !== -1 ? String(row[colIdx.branch] ?? '').trim() : '';

        // Валидации & нормализации
        if (!rawPhone) {
          errors.push({
            line: lineNumber,
            reason: 'Отсутствует номер телефона',
          });
          continue;
        }

        const phoneNumber = this.normalizePhone(rawPhone);
        if (!phoneNumber.ok) {
          errors.push({ line: lineNumber, reason: phoneNumber.error! });
          continue;
        }

        if (!rawName) {
          errors.push({ line: lineNumber, reason: 'Отсутствует имя' });
          continue;
        }

        const { firstName, lastName } = this.splitName(rawName);

        if (!rawBranch) {
          errors.push({ line: lineNumber, reason: 'Отсутствует филиал' });
          continue;
        }

        let branch: string;
        try {
          branch = this.normalizeBranch(rawBranch, lineNumber);
        } catch (e: any) {
          errors.push({
            line: lineNumber,
            reason: e?.message || 'Некорректный филиал',
          });
          continue;
        }

        const key = `${phoneNumber.value}__${currentCheckoutISO ?? ''}`;
        if (seenInFile.has(key)) {
          continue;
        }
        seenInFile.add(key);

        const entity = this.patientRepository.create();

        toCreate.push(entity);
      }

      // 3) (Опциональная) дедупликация с БД по паре (phoneNumber, checkOutTime)
      //    Чтобы не грузить все телефоны, сначала забираем только те, что потенциально совпадут
      if (toCreate.length > 0) {
        const phones = Array.from(new Set(toCreate.map((p) => p.phoneNumber)));
        const existing = await this.patientRepository.find({
          where: { phoneNumber: In(phones) },
          select: ['id', 'phoneNumber', 'checkOutTime'],
        });

        const existingKeys = new Set(
          existing.map((e) => `${e.phoneNumber}__${e.checkOutTime ?? ''}`),
        );

        // Оставляем только новые записи
        const filtered = toCreate.filter(
          (p) => !existingKeys.has(`${p.phoneNumber}__${p.checkOutTime ?? ''}`),
        );
        const skippedDuplicates = toCreate.length - filtered.length;

        // 4) Пакетное сохранение (минимум запросов)
        //    Можно ещё дробить на чанки по 1000 при очень больших файлах
        if (filtered.length > 0) {
          await this.patientRepository.save(filtered, { chunk: 500 });
        }

        const report: ImportReport = {
          totalRows: rows.length,
          detectedHeaderAt: headerIndex + 1,
          imported: filtered.length,
          skippedDuplicates,
          errors,
        };

        // Если есть ошибки, но что-то импортировали — возвращаем отчёт без исключения
        // Если импортировали 0 и есть ошибки — можно выбросить 400 для жёсткого фейла
        if (report.imported === 0 && errors.length > 0) {
          throw new BadRequestException(
            `Импорт не выполнен. Ошибок: ${errors.length}. Пример: ${errors[0].reason} (строка ${errors[0].line}).`,
          );
        }

        return report;
      }

      // Нечего сохранять
      return {
        totalRows: rows.length,
        detectedHeaderAt: headerIndex + 1,
        imported: 0,
        skippedDuplicates: 0,
        errors: [
          {
            line: headerIndex + 2,
            reason: 'Не найдено валидных данных после заголовков',
          },
        ],
      };
    } catch (err: any) {
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      throw new InternalServerErrorException(
        `Ошибка при импорте: ${err.message}`,
      );
    }
  }

  // ---------- Хелперы импорта ----------

  /** Поиск индекса строки с заголовками (гибкие названия) */
  private findHeaderRowIndex(rows: any[][]): number {
    const headerLike = (cell: string) =>
      /имя|фамил/i.test(cell) ||
      /телефон|номер/i.test(cell) ||
      /филиал/i.test(cell);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const matches = row.filter((c) => headerLike(String(c))).length;
      if (matches >= 2) return i; // как минимум 2 из 3-х нашли
    }
    return -1;
  }

  /** Маппинг индексов колонок по заголовкам */
  private mapHeaderIndices(headerRow: string[]): {
    name: number;
    phone: number;
    branch: number;
  } {
    const findIdx = (needles: RegExp[]) =>
      headerRow.findIndex((h) =>
        needles.some((re) => re.test(h.toLowerCase())),
      );

    const name = findIdx([/имя/i, /фамил/i, /имя.*фамил/i, /фио/i]);
    const phone = findIdx([/телефон/i, /номер/i, /phone/i]);
    const branch = findIdx([/филиал/i, /branch/i]);

    return { name, phone, branch };
  }

  /** Ряд является «строкой-датой», если заполнена 1 ячейка и она похожа на дату, либо это excel-serial */
  private isDateSeparatorRow(row: any[]): boolean {
    const nonEmpty = row.map((c) => String(c).trim()).filter((v) => v !== '');
    if (nonEmpty.length !== 1) return false;

    const value = nonEmpty[0];

    if (this.parseAsISODate([value])) return true;

    // excel serial number (целое положительное)
    if (/^\d+$/.test(value)) {
      const num = Number(value);
      return num > 25000 && num < 80000; // разумный диапазон для excel дат
    }
    return false;
  }

  /** Преобразование строки даты в ISO (YYYY-MM-DD) */
  private parseAsISODate(row: any[]): string | null {
    const nonEmpty = row.map((c) => String(c).trim()).filter((v) => v !== '');
    if (nonEmpty.length !== 1) return null;
    let v = nonEmpty[0];

    // Excel serial date
    if (/^\d+$/.test(v)) {
      const serial = Number(v);
      // 25569 — 1970-01-01; excel day → JS ms
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
    }

    // Заменяем разделители
    v = v.replace(/[,\.\s]/g, '/'); // 12,08,2025 → 12/08/2025
    const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (!m) return null;

    let [_, d, mo, y] = m;
    if (y.length === 2) y = Number(y) < 50 ? `20${y}` : `19${y}`;

    const day = Number(d);
    const mon = Number(mo);
    const year = Number(y);
    const date = new Date(Date.UTC(year, mon - 1, day));
    if (isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  }

  /** Имя + (необяз.) фамилия */
  private splitName(full: string): {
    firstName: string;
    lastName: string | null;
  } {
    const parts = full
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return { firstName: '', lastName: null };
    if (parts.length === 1) return { firstName: parts[0], lastName: null };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }

  /** Телефон: только полные номера. 8xxxxxxxxxxx → 7xxxxxxxxxxx (KZ) */
  /**
   * Универсальная нормализация телефонов СНГ/Средней Азии в формат E.164
   */
  private normalizePhone(
    input: string,
  ): { ok: true; value: string } | { ok: false; error: string } {
    let raw = input.replace(/\s|\(|\)|-|_/g, '').trim(); // убираем пробелы, скобки, дефисы

    if (!raw) return { ok: false, error: 'Пустой номер телефона' };

    // 1) Если начинается с 8 и длина >= 10 → считаем это как "местный" -> заменяем на +7...
    if (raw.startsWith('8') && raw.length >= 10) {
      raw = '+7' + raw.slice(1);
    }

    // 2) Если начинается с 7 (без плюса) → добавляем +
    if (/^7\d{9,}$/.test(raw)) {
      raw = '+' + raw;
    }

    // 3) Если начинается с 9 и совпадает с известным кодом стран (UZ, KG, TJ, TM, AZ, AM, GE, UA, etc.)
    const knownCodes = ['998', '996', '992', '993', '994', '995', '374', '380'];
    for (const code of knownCodes) {
      if (raw.startsWith(code)) {
        raw = '+' + raw;
        break;
      }
    }

    // 4) Если начинается с "+" → оставляем
    if (!raw.startsWith('+')) {
      return {
        ok: false,
        error: `Номер "${input}" не в международном формате`,
      };
    }

    // 5) Проверка длины (E.164: максимум 15 цифр, минимум 10)
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      return {
        ok: false,
        error: `Номер "${input}" имеет недопустимую длину (${digits.length} цифр)`,
      };
    }

    return { ok: true, value: raw };
  }

  /** Нормализация филиала через best-match среди Branches */
  private normalizeBranch(inputBranch: string, lineNumber: number): string {
    const branchList = Object.values(Branches).map((b) => String(b).trim());
    const query = inputBranch.trim();

    const { bestMatch, bestMatchIndex } = stringSimilarity.findBestMatch(
      query.toLowerCase(),
      branchList.map((b) => b.toLowerCase()),
    );

    if (bestMatch.rating < 0.6) {
      throw new BadRequestException(
        `Ошибка в строке ${lineNumber}: филиал "${inputBranch}" не распознан`,
      );
    }

    return branchList[bestMatchIndex];
  }

  // ---------- Остальные методы сервиса (без изменений/с минимальными правками) ----------

  async addPatientManually(
    patientDto: CreatePatientDto,
  ): Promise<PatientEntity> {
    const { firstName, lastName, phoneNumber, branch } = patientDto;

    const phone = this.normalizePhone(phoneNumber);
    if (!phone.ok) throw new BadRequestException(phone.error);

    const entity = this.patientRepository.create({
      firstName,
      lastName,
      phoneNumber: phone.value,
      branch: this.normalizeBranch(branch, 0),
      status: PatientStatus.NEW,
    });

    return await this.patientRepository.save(entity);
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
