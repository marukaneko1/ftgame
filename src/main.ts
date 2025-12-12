import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
const cookieParser = require("cookie-parser");
import { raw } from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Don't set global prefix in serverless mode (Vercel)
  if (!process.env.VERCEL) {
    app.setGlobalPrefix("api");
  }
  
  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.WEB_BASE_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  });
  
  app.use(cookieParser());
  // Stripe requires the raw body for signature verification on webhook endpoints.
  app.use("/api/subscriptions/webhook", raw({ type: "application/json" }));
  app.use("/api/wallet/stripe/webhook", raw({ type: "application/json" }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}`, "Bootstrap");
}

bootstrap();

