import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { type Response } from 'express';
import { ReportService } from './report.service';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('excel')
  async getExcelReport(
    @Query('start') start: string,
    @Query('end') end: string,
    @Res() res: Response,
  ) {
    if (!start || !end) {
      throw new BadRequestException('Укажите даты start и end в формате YYYY-MM-DD');
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Неверный формат даты. Используйте YYYY-MM-DD');
    }

    const buffer = await this.reportService.generateReport(startDate, endDate);

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=report_${start}_${end}.xlsx`,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    res.send(buffer);
  }
}
