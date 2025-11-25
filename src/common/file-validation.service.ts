import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileValidationService {
  /**
   * Validate photo file according to SRS requirements
   * Size: 40kb - 100kb
   * Format: JPG/PNG
   * Dimension: 3.5cm x 3cm (approximately 138x118 pixels at 100 DPI)
   */
  validatePhoto(file: Express.Multer.File): void {
    this.validateFileFormat(file, ['image/jpeg', 'image/png']);
    this.validateFileSize(file, 40 * 1024, 100 * 1024, 'Photo');
  }

  /**
   * Validate signature file according to SRS requirements
   * Size: 20kb - 60kb
   * Format: JPG/PNG
   */
  validateSignature(file: Express.Multer.File): void {
    this.validateFileFormat(file, ['image/jpeg', 'image/png']);
    this.validateFileSize(file, 20 * 1024, 60 * 1024, 'Signature');
  }

  private validateFileFormat(file: Express.Multer.File, allowedMimeTypes: string[]): void {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file format. Only JPG and PNG files are allowed. Received: ${file.mimetype}`
      );
    }
  }

  private validateFileSize(file: Express.Multer.File, minSize: number, maxSize: number, fileType: string): void {
    const fileSizeKB = Math.round(file.size / 1024);
    const minSizeKB = Math.round(minSize / 1024);
    const maxSizeKB = Math.round(maxSize / 1024);

    if (file.size < minSize || file.size > maxSize) {
      throw new BadRequestException(
        `${fileType} size must be between ${minSizeKB}kb and ${maxSizeKB}kb. Current size: ${fileSizeKB}kb`
      );
    }
  }
}
