"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var MatchmakingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchmakingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("@nestjs/config");
let MatchmakingService = MatchmakingService_1 = class MatchmakingService {
    prisma;
    redis = null;
    logger = new common_1.Logger(MatchmakingService_1.name);
    userQueues = new Map();
    cleanupInterval = null;
    STALE_ENTRY_MS = 10 * 60 * 1000;
    constructor(prisma, configService) {
        this.prisma = prisma;
        const redisUrl = configService.get("redisUrl");
        if (redisUrl) {
            try {
                const isUpstash = redisUrl.includes('upstash.io');
                const redisOptions = redisUrl;
                if (isUpstash) {
                    this.redis = new ioredis_1.default(redisUrl, {
                        tls: {
                            rejectUnauthorized: false
                        }
                    });
                }
                else {
                    this.redis = new ioredis_1.default(redisUrl);
                }
                this.logger.log('Redis connected successfully');
                this.cleanupInterval = setInterval(() => {
                    this.cleanupStaleEntries();
                }, 5 * 60 * 1000);
            }
            catch (error) {
                this.logger.warn(`Failed to connect to Redis: ${error?.message || 'Unknown error'}. Matchmaking will not work.`);
            }
        }
        else {
            this.logger.warn('REDIS_URL not configured. Matchmaking will not work.');
        }
    }
    ensureRedis() {
        if (!this.redis) {
            throw new Error('Redis is not configured. REDIS_URL environment variable is required for matchmaking.');
        }
        return this.redis;
    }
    async cleanupStaleEntries() {
        if (!this.redis)
            return;
        const now = Date.now();
        const staleUserIds = [];
        for (const [userId, entry] of this.userQueues.entries()) {
            if (now - entry.addedAt > this.STALE_ENTRY_MS) {
                staleUserIds.push(userId);
            }
        }
        for (const userId of staleUserIds) {
            const entry = this.userQueues.get(userId);
            if (!entry)
                continue;
            const items = await this.redis.lrange(entry.key, 0, -1);
            let stillInQueue = false;
            for (const item of items) {
                try {
                    const parsed = JSON.parse(item);
                    if (parsed.userId === userId) {
                        stillInQueue = true;
                        break;
                    }
                }
                catch {
                    continue;
                }
            }
            if (!stillInQueue) {
                this.userQueues.delete(userId);
                console.log(`[Matchmaking] Cleaned up stale entry for user ${userId}`);
            }
            else {
                this.userQueues.set(userId, { key: entry.key, addedAt: now });
            }
        }
    }
    onModuleDestroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
    async joinQueue(userId, region, language, latitude, longitude) {
        const eligible = await this.ensureEligible(userId);
        if (!eligible) {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    isBanned: true,
                    is18PlusVerified: true,
                    subscription: { select: { status: true } }
                }
            });
            let reason = "Not eligible for matchmaking";
            if (!user)
                reason = "User not found";
            else if (user.isBanned)
                reason = "Account is banned";
            else if (!user.is18PlusVerified)
                reason = "Age verification required (18+)";
            else if (user.subscription?.status !== "ACTIVE")
                reason = "Active subscription required";
            throw new common_1.UnauthorizedException(reason);
        }
        if (latitude === undefined || longitude === undefined) {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { latitude: true, longitude: true }
            });
            latitude = user?.latitude ?? undefined;
            longitude = user?.longitude ?? undefined;
        }
        const key = this.queueKey(region, language);
        await this.leaveQueue(userId);
        const redis = this.ensureRedis();
        const payload = { userId, region, language, latitude, longitude, enqueuedAt: Date.now() };
        await redis.rpush(key, JSON.stringify(payload));
        this.userQueues.set(userId, { key, addedAt: Date.now() });
        const match = await this.findClosestMatch(userId, key, latitude, longitude);
        if (match) {
            return match;
        }
        const redisClient = this.ensureRedis();
        const length = await redisClient.llen(key);
        console.log(`User ${userId} joined queue ${key}. Queue length: ${length}`);
        return null;
    }
    async leaveQueue(userId) {
        const entry = this.userQueues.get(userId);
        let key = entry?.key;
        if (!key) {
            try {
                const redisClient = this.ensureRedis();
                const allQueueKeys = await redisClient.keys("match_queue:*");
                for (const possibleKey of allQueueKeys) {
                    const items = await redisClient.lrange(possibleKey, 0, -1);
                    for (const item of items) {
                        try {
                            const parsed = JSON.parse(item);
                            if (parsed.userId === userId) {
                                key = possibleKey;
                                break;
                            }
                        }
                        catch {
                            continue;
                        }
                    }
                    if (key)
                        break;
                }
            }
            catch (err) {
                console.error("[Matchmaking] Error scanning queues:", err);
            }
        }
        if (!key)
            return;
        const redis = this.ensureRedis();
        const items = await redis.lrange(key, 0, -1);
        let removed = 0;
        for (const item of items) {
            try {
                const parsed = JSON.parse(item);
                if (parsed.userId === userId) {
                    const removedCount = await redis.lrem(key, 0, item);
                    removed += removedCount;
                }
            }
            catch {
                continue;
            }
        }
        if (removed > 0) {
            console.log(`[Matchmaking] Removed ${removed} queue entry/entries for user ${userId} from ${key}`);
        }
        this.userQueues.delete(userId);
    }
    async findMatch(userId, region, language, latitude, longitude) {
        const key = this.queueKey(region, language);
        return this.findClosestMatch(userId, key, latitude, longitude);
    }
    async findClosestMatch(userId, queueKey, userLat, userLon) {
        const redisClient = this.ensureRedis();
        const length = await redisClient.llen(queueKey);
        console.log(`[Matchmaking] findClosestMatch for ${userId}, queue length: ${length}`);
        if (length < 2) {
            console.log(`[Matchmaking] Queue too short (${length} < 2)`);
            return null;
        }
        const allItems = await redisClient.lrange(queueKey, 0, -1);
        console.log(`[Matchmaking] Found ${allItems.length} items in queue`);
        const queueRequests = [];
        for (const item of allItems) {
            try {
                const request = JSON.parse(item);
                if (request.userId === userId) {
                    console.log(`[Matchmaking] Skipping self: ${userId}`);
                    continue;
                }
                const eligible = await this.ensureEligible(request.userId);
                if (!eligible) {
                    console.log(`[Matchmaking] User ${request.userId} is not eligible`);
                    continue;
                }
                let distance = Infinity;
                if (userLat !== undefined && userLon !== undefined && request.latitude !== undefined && request.longitude !== undefined) {
                    distance = this.calculateDistance(userLat, userLon, request.latitude, request.longitude);
                }
                console.log(`[Matchmaking] Found eligible user ${request.userId}, distance: ${distance}`);
                queueRequests.push({ request, distance });
            }
            catch (e) {
                console.error(`[Matchmaking] Error parsing queue item:`, e);
                continue;
            }
        }
        if (queueRequests.length === 0) {
            console.log(`[Matchmaking] No eligible matches found`);
            return null;
        }
        queueRequests.sort((a, b) => a.distance - b.distance);
        const closestMatch = queueRequests[0].request;
        console.log(`[Matchmaking] Closest match: ${closestMatch.userId} (distance: ${queueRequests[0].distance})`);
        let currentUserRequest = null;
        let currentUserJson = null;
        for (const item of allItems) {
            try {
                const request = JSON.parse(item);
                if (request.userId === userId) {
                    currentUserRequest = request;
                    currentUserJson = item;
                    break;
                }
            }
            catch {
                continue;
            }
        }
        if (!currentUserRequest || !currentUserJson) {
            console.log(`[Matchmaking] Current user's request not found in queue`);
            return null;
        }
        let matchUserJson = null;
        for (const item of allItems) {
            try {
                const request = JSON.parse(item);
                if (request.userId === closestMatch.userId) {
                    matchUserJson = item;
                    break;
                }
            }
            catch {
                continue;
            }
        }
        if (!matchUserJson) {
            console.log(`[Matchmaking] Match user's request not found in queue`);
            return null;
        }
        try {
            await redisClient.watch(queueKey);
            const currentQueueItems = await redisClient.lrange(queueKey, 0, -1);
            const currentUserStillInQueue = currentQueueItems.includes(currentUserJson);
            const matchUserStillInQueue = currentQueueItems.includes(matchUserJson);
            if (!currentUserStillInQueue || !matchUserStillInQueue) {
                await redisClient.unwatch();
                console.log(`[Matchmaking] Users no longer in queue (current: ${currentUserStillInQueue}, match: ${matchUserStillInQueue})`);
                return null;
            }
            const pipeline = redisClient.multi();
            pipeline.lrem(queueKey, 1, currentUserJson);
            pipeline.lrem(queueKey, 1, matchUserJson);
            const results = await pipeline.exec();
            if (!results) {
                console.log(`[Matchmaking] Transaction aborted - queue was modified by another process`);
                return null;
            }
            const removed1 = results[0]?.[1];
            const removed2 = results[1]?.[1];
            if (removed1 === 0 || removed2 === 0) {
                console.log(`[Matchmaking] Removal failed in transaction (removed1: ${removed1}, removed2: ${removed2})`);
                if (removed1 > 0 && removed2 === 0) {
                    await redisClient.rpush(queueKey, currentUserJson);
                }
                return null;
            }
            console.log(`[Matchmaking] Successfully matched ${userId} with ${closestMatch.userId} (atomic)`);
        }
        catch (err) {
            console.error(`[Matchmaking] Transaction error:`, err);
            if (this.redis) {
                await this.redis.unwatch();
            }
            return null;
        }
        this.userQueues.delete(userId);
        this.userQueues.delete(closestMatch.userId);
        return [currentUserRequest, closestMatch];
    }
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }
    queueKey(region, language) {
        return `match_queue:${region}:${language}`;
    }
    async ensureEligible(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                isBanned: true,
                is18PlusVerified: true,
                subscription: { select: { status: true } }
            }
        });
        if (!user)
            return false;
        if (user.isBanned)
            return false;
        if (!user.is18PlusVerified)
            return false;
        if (user.subscription?.status !== "ACTIVE")
            return false;
        return true;
    }
};
exports.MatchmakingService = MatchmakingService;
exports.MatchmakingService = MatchmakingService = MatchmakingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, config_1.ConfigService])
], MatchmakingService);
//# sourceMappingURL=matchmaking.service.js.map