import { Injectable, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private minioClient: Minio.Client;
  private readonly useS3 = process.env.USE_S3 === 'true';
  private readonly bucketName = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME || 'bseb-connect-uploads';
  private readonly region = process.env.AWS_REGION || process.env.S3_REGION || 'ap-south-1';

  async onModuleInit() {
    if (this.useS3) {
      // AWS S3 Configuration
      this.minioClient = new Minio.Client({
        endPoint: `s3.${this.region}.amazonaws.com`,
        port: 443,
        useSSL: true,
        accessKey: process.env.AWS_ACCESS_KEY_ID || '',
        secretKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        region: this.region,
      });
      console.log(`✅ Using AWS S3 bucket: ${this.bucketName}`);
    } else {
      // Local MinIO Configuration
      this.minioClient = new Minio.Client({
        endPoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: parseInt(process.env.MINIO_PORT || '9000'),
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      });

      // Create bucket if it doesn't exist
      try {
        const exists = await this.minioClient.bucketExists(this.bucketName);
        if (!exists) {
          await this.minioClient.makeBucket(this.bucketName, this.region);
          console.log(`✅ Created MinIO bucket: ${this.bucketName}`);
        }
      } catch (error) {
        console.error('MinIO bucket creation error:', error);
      }
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    const fileName = `${folder}/${Date.now()}-${file.originalname}`;
    
    await this.minioClient.putObject(
      this.bucketName,
      fileName,
      file.buffer,
      file.size,
      {
        'Content-Type': file.mimetype,
      },
    );

    return fileName;
  }

  async getFileUrl(fileName: string): Promise<string> {
    if (this.useS3) {
      // Return direct public S3 URL
      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`;
    }
    // Generate presigned URL for MinIO (valid for 7 days)
    return await this.minioClient.presignedGetObject(
      this.bucketName,
      fileName,
      7 * 24 * 60 * 60,
    );
  }

  async deleteFile(fileName: string): Promise<void> {
    await this.minioClient.removeObject(this.bucketName, fileName);
  }
}
