import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { AuthModule } from '../auth/auth.module';

// Common
import { BsebBaseService } from './common/bseb-base.service';

// Services
import { FormDataService } from './services/form-data.service';
import { AdmitCardService } from './services/admit-card.service';

// Controllers
import { FormDataController } from './controllers/form-data.controller';
import { AdmitCardController } from './controllers/admit-card.controller';

/**
 * BSEB Module - Handles all BSEB external API integrations
 *
 * Structure:
 * - config/     - API configuration (endpoints, keys, cache TTLs)
 * - common/     - Base service with shared utilities
 * - dto/        - Data transfer objects organized by domain
 * - services/   - Domain-specific services (form-data, admit-card, etc.)
 * - controllers/ - REST endpoints organized by domain
 *
 * To add a new BSEB API domain:
 * 1. Add config in config/bseb-api.config.ts
 * 2. Create DTOs in dto/{domain}/
 * 3. Create service in services/{domain}.service.ts extending BsebBaseService
 * 4. Create controller in controllers/{domain}.controller.ts
 * 5. Register service and controller in this module
 */
@Module({
  imports: [RedisModule, AuthModule],
  controllers: [
    FormDataController,
    AdmitCardController,
    // Future: ResultsController, MarksheetController, CertificateController
  ],
  providers: [
    BsebBaseService,
    FormDataService,
    AdmitCardService,
    // Future: ResultsService, MarksheetService, CertificateService
  ],
  exports: [
    FormDataService,
    AdmitCardService,
    // Future: ResultsService, MarksheetService, CertificateService
  ],
})
export class BsebModule {}
