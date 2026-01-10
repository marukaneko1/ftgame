import { INestApplication, Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  private connectionAttempted = false;

  async onModuleInit() {
    // Skip connection in serverless environments - connect on first query instead
    // This prevents timeouts during serverless function initialization
    if (process.env.IS_SERVERLESS === 'true') {
      this.logger.log('Skipping database connection in serverless mode - will connect on first query');
      return;
    }
    
    // Lazy connection: only connect when actually needed
    // This prevents crashes during serverless function initialization
    // Connection will happen on first query instead
    try {
      if (!this.connectionAttempted) {
        this.connectionAttempted = true;
        await this.$connect();
        this.logger.log('Database connected successfully');
      }
    } catch (error: any) {
      this.logger.error('Failed to connect to database:', error.message);
      // Don't throw - let queries handle connection errors
      // This allows the app to start even if DB is temporarily unavailable
    }
  }

  async enableShutdownHooks(app: INestApplication) {
    (this as any).$on("beforeExit", async () => {
      await app.close();
    });
  }
}

