import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdmitCardService } from '../services/admit-card.service';
import { GetAdmitCardRequestDto, AdmitCardResponseDto } from '../dto/admit-card';

/**
 * Controller for BSEB Admit Card endpoints
 */
@Controller('bseb/admit-card')
@UseGuards(JwtAuthGuard)
export class AdmitCardController {
  constructor(private readonly admitCardService: AdmitCardService) {}

  /**
   * Get theory admit card
   * POST /bseb/admit-card/theory
   *
   * @body { registrationNumber: "R-711000111-23" }
   * OR
   * @body { rollCode: "71100", rollNumber: "123456789" }
   */
  @Post('theory')
  @HttpCode(HttpStatus.OK)
  async getTheoryAdmitCard(
    @Body() dto: GetAdmitCardRequestDto,
  ): Promise<AdmitCardResponseDto> {
    return this.admitCardService.getTheoryAdmitCard(dto);
  }

  /**
   * Get practical admit card
   * POST /bseb/admit-card/practical
   *
   * @body { registrationNumber: "R-711000111-23" }
   * OR
   * @body { rollCode: "71100", rollNumber: "123456789" }
   */
  @Post('practical')
  @HttpCode(HttpStatus.OK)
  async getPracticalAdmitCard(
    @Body() dto: GetAdmitCardRequestDto,
  ): Promise<AdmitCardResponseDto> {
    return this.admitCardService.getPracticalAdmitCard(dto);
  }

  /**
   * Clear cache for admit cards
   * DELETE /bseb/admit-card/cache/:identifier
   *
   * @param identifier - Registration number or rollCode-rollNumber
   */
  @Delete('cache/:identifier')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearCache(@Param('identifier') identifier: string): Promise<void> {
    await this.admitCardService.clearCache(identifier);
  }
}
