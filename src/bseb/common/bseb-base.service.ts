import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { RedisService } from '../../redis/redis.service';
import { BsebApiConfig } from '../config/bseb-api.config';
import { BsebBaseResponse, BsebErrorResponse } from '../dto/common';

/**
 * Base service providing common functionality for all BSEB API integrations
 * - HTTP requests with retry logic
 * - Redis caching
 * - Error handling
 * - Response transformation
 */
@Injectable()
export class BsebBaseService {
  protected readonly logger = new Logger(BsebBaseService.name);

  constructor(protected readonly redisService: RedisService) {}

  /**
   * Make a GET request to external BSEB API
   */
  protected async httpGet<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const defaultConfig: AxiosRequestConfig = {
      timeout: BsebApiConfig.global.timeout,
      headers: {
        Accept: 'application/json',
        'User-Agent': BsebApiConfig.global.userAgent,
      },
      ...config,
    };

    return this.executeWithRetry(() => axios.get<T>(url, defaultConfig));
  }

  /**
   * Make a POST request to external BSEB API
   */
  protected async httpPost<T>(
    url: string,
    data: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const defaultConfig: AxiosRequestConfig = {
      timeout: BsebApiConfig.global.timeout,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': BsebApiConfig.global.userAgent,
      },
      ...config,
    };

    return this.executeWithRetry(() => axios.post<T>(url, data, defaultConfig));
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<{ data: T }>,
    retries: number = BsebApiConfig.global.retryAttempts,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await requestFn();
        return response.data;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on 4xx errors (client errors)
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          if (status !== undefined && status >= 400 && status < 500) {
            throw error;
          }
        }

        // Wait before retrying
        if (attempt < retries) {
          this.logger.warn(`Request failed, retrying (${attempt + 1}/${retries})...`);
          await this.delay(BsebApiConfig.global.retryDelay * (attempt + 1));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Get data from cache
   */
  protected async getFromCache<T>(cacheKey: string): Promise<T | null> {
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      this.logger.warn(`Cache read error for ${cacheKey}: ${error.message}`);
    }
    return null;
  }

  /**
   * Store data in cache
   */
  protected async setInCache(
    cacheKey: string,
    data: any,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.redisService.set(cacheKey, JSON.stringify(data), ttlSeconds);
    } catch (error) {
      this.logger.warn(`Cache write error for ${cacheKey}: ${error.message}`);
    }
  }

  /**
   * Delete from cache
   */
  protected async deleteFromCache(cacheKey: string): Promise<void> {
    try {
      await this.redisService.delete(cacheKey);
    } catch (error) {
      this.logger.warn(`Cache delete error for ${cacheKey}: ${error.message}`);
    }
  }

  /**
   * Delete multiple cache keys by pattern
   */
  protected async deleteCacheByPrefix(prefix: string, identifier: string): Promise<void> {
    const patterns = [
      `${prefix}:${identifier}`,
      `${prefix}:theory:${identifier}`,
      `${prefix}:practical:${identifier}`,
    ];

    for (const key of patterns) {
      await this.deleteFromCache(key);
    }
  }

  /**
   * Handle and normalize errors from external API calls
   */
  protected handleApiError(
    error: any,
    context: string,
    identifier: string,
  ): BsebErrorResponse {
    const timestamp = new Date().toISOString();

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        const status = axiosError.response.status;
        const responseData = axiosError.response.data as any;

        this.logger.error(
          `BSEB API error [${context}] (${identifier}): ${status} - ${JSON.stringify(responseData)}`,
        );

        if (status === 404) {
          return {
            success: false,
            message: responseData?.message || 'No record found for the given details.',
            errorCode: 'NOT_FOUND',
            timestamp,
          };
        }

        if (status === 400) {
          return {
            success: false,
            message: responseData?.message || 'Invalid request parameters.',
            errorCode: 'BAD_REQUEST',
            timestamp,
          };
        }

        if (status === 401 || status === 403) {
          return {
            success: false,
            message: 'Access denied to BSEB services.',
            errorCode: 'UNAUTHORIZED',
            timestamp,
          };
        }

        if (status >= 500) {
          return {
            success: false,
            message: 'BSEB server error. Please try again later.',
            errorCode: 'SERVER_ERROR',
            timestamp,
          };
        }

        return {
          success: false,
          message: responseData?.message || `Failed to fetch ${context}.`,
          errorCode: 'API_ERROR',
          timestamp,
        };
      }

      // Network errors
      if (axiosError.code === 'ECONNABORTED') {
        this.logger.error(`BSEB API timeout [${context}] (${identifier})`);
        return {
          success: false,
          message: 'Request timed out. Please try again.',
          errorCode: 'TIMEOUT',
          timestamp,
        };
      }

      if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
        this.logger.error(`BSEB API unreachable [${context}] (${identifier})`);
        return {
          success: false,
          message: 'BSEB server is currently unavailable. Please try again later.',
          errorCode: 'UNAVAILABLE',
          timestamp,
        };
      }
    }

    this.logger.error(`Unexpected error [${context}] (${identifier}): ${error.message}`);
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again.',
      errorCode: 'UNKNOWN_ERROR',
      timestamp,
    };
  }

  /**
   * Create success response
   */
  protected createSuccessResponse<T>(
    data: T,
    cached: boolean = false,
  ): BsebBaseResponse<T> {
    return {
      success: true,
      data,
      cached,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Utility: Normalize field value (handle various casing)
   */
  protected getFieldValue(obj: any, ...keys: string[]): any {
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        return obj[key];
      }
    }
    return undefined;
  }

  /**
   * Utility: Delay execution
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
