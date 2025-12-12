import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
  health() {
    return {
      status: 'ok',
      message: 'API is running',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('api')
  apiHealth() {
    return {
      status: 'ok',
      message: 'API is running',
      timestamp: new Date().toISOString(),
    };
  }
}

