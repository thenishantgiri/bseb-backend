import { Module, Global } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

@Global()
@Module({
  imports: [
    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 1000,  // 1 second
      limit: 3,   // 3 requests per second
    }, {
      name: 'medium',
      ttl: 10000, // 10 seconds  
      limit: 20,  // 20 requests per 10 seconds
    }, {
      name: 'long',
      ttl: 60000, // 60 seconds (1 minute)
      limit: 100, // 100 requests per minute
    }]),
  ],
  exports: [ThrottlerModule],
})
export class ThrottlerConfigModule {}
