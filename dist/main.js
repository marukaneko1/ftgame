"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const cookieParser = require("cookie-parser");
const express_1 = require("express");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix("api");
    app.enableCors({
        origin: process.env.WEB_BASE_URL || "http://localhost:3000",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"]
    });
    app.use(cookieParser());
    app.use("/api/subscriptions/webhook", (0, express_1.raw)({ type: "application/json" }));
    app.use("/api/wallet/stripe/webhook", (0, express_1.raw)({ type: "application/json" }));
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
    }));
    const port = process.env.PORT || 3001;
    await app.listen(port);
    common_1.Logger.log(`API listening on http://localhost:${port}`, "Bootstrap");
}
bootstrap();
//# sourceMappingURL=main.js.map