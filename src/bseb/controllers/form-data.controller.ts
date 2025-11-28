import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FormDataService } from '../services/form-data.service';
import { FormDataResponseDto } from '../dto/form-data';

/**
 * Controller for BSEB Form/Registration Data endpoints
 */
@Controller('bseb/form-data')
@UseGuards(JwtAuthGuard)
export class FormDataController {
  constructor(private readonly formDataService: FormDataService) {}

  /**
   * Get student form/registration data
   * GET /bseb/form-data/:registrationNumber
   *
   * @example GET /bseb/form-data/91341-00009-24
   */
  @Get(':registrationNumber')
  async getFormData(
    @Param('registrationNumber') registrationNumber: string,
  ): Promise<FormDataResponseDto> {
    return this.formDataService.getFormData(registrationNumber);
  }

  /**
   * Clear cache for form data
   * DELETE /bseb/form-data/cache/:registrationNumber
   */
  @Delete('cache/:registrationNumber')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearCache(
    @Param('registrationNumber') registrationNumber: string,
  ): Promise<void> {
    await this.formDataService.clearCache(registrationNumber);
  }
}
