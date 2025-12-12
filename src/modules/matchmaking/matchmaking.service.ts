import { Injectable, UnauthorizedException, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import Redis from "ioredis";
import { ConfigService } from "@nestjs/config";

interface QueueRequest {
  userId: string;
  region: string;
  language: string;
  latitude?: number;
  longitude?: number;
  enqueuedAt: number;
}

@Injectable()
export class MatchmakingService implements OnModuleDestroy {
  private redis: Redis | null = null;
  private readonly logger = new Logger(MatchmakingService.name);
  // Track user -> queue key mapping (with timestamps for cleanup)
  private userQueues = new Map<string, { key: string; addedAt: number }>();
  // Cleanup interval (every 5 minutes, remove entries older than 10 minutes)
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly STALE_ENTRY_MS = 10 * 60 * 1000; // 10 minutes

  constructor(private readonly prisma: PrismaService, configService: ConfigService) {
    const redisUrl = configService.get<string>("redisUrl");
    if (redisUrl) {
      try {
        // Upstash requires TLS - configure ioredis to use TLS for secure connections
        const isUpstash = redisUrl.includes('upstash.io');
        const redisOptions: any = redisUrl;
        
        if (isUpstash) {
          // For Upstash, we need to parse the URL and add TLS config
          // The URL format is: redis://default:PASSWORD@HOST:PORT
          this.redis = new Redis(redisUrl, {
            tls: {
              rejectUnauthorized: false // Upstash uses self-signed certificates
            }
          });
        } else {
          this.redis = new Redis(redisUrl);
        }
        this.logger.log('Redis connected successfully');
        
        // Start periodic cleanup of stale userQueues entries
        this.cleanupInterval = setInterval(() => {
          this.cleanupStaleEntries();
        }, 5 * 60 * 1000); // Every 5 minutes
      } catch (error: any) {
        this.logger.warn(`Failed to connect to Redis: ${error?.message || 'Unknown error'}. Matchmaking will not work.`);
      }
    } else {
      this.logger.warn('REDIS_URL not configured. Matchmaking will not work.');
    }
  }

  /**
   * Ensure Redis is available, throw helpful error if not
   */
  private ensureRedis(): Redis {
    if (!this.redis) {
      throw new Error('Redis is not configured. REDIS_URL environment variable is required for matchmaking.');
    }
    return this.redis;
  }

  /**
   * Cleanup stale entries from userQueues map
   * This prevents memory leaks when Redis is cleared or users disconnect without proper cleanup
   */
  private async cleanupStaleEntries() {
    if (!this.redis) return; // Skip if Redis not available
    
    const now = Date.now();
    const staleUserIds: string[] = [];
    
    for (const [userId, entry] of this.userQueues.entries()) {
      // Check if entry is stale (older than 10 minutes)
      if (now - entry.addedAt > this.STALE_ENTRY_MS) {
        staleUserIds.push(userId);
      }
    }
    
    // Verify and clean up stale entries
    for (const userId of staleUserIds) {
      const entry = this.userQueues.get(userId);
      if (!entry) continue;
      
      // Check if user is actually still in the Redis queue
      const items = await this.redis.lrange(entry.key, 0, -1);
      let stillInQueue = false;
      
      for (const item of items) {
        try {
          const parsed = JSON.parse(item);
          if (parsed.userId === userId) {
            stillInQueue = true;
            break;
          }
        } catch {
          continue;
        }
      }
      
      if (!stillInQueue) {
        this.userQueues.delete(userId);
        console.log(`[Matchmaking] Cleaned up stale entry for user ${userId}`);
      } else {
        // Update timestamp since user is still in queue
        this.userQueues.set(userId, { key: entry.key, addedAt: now });
      }
    }
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  async joinQueue(userId: string, region: string, language: string, latitude?: number, longitude?: number) {
    const eligible = await this.ensureEligible(userId);
    if (!eligible) {
      // Get more details for better error message
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          isBanned: true,
          is18PlusVerified: true,
          subscription: { select: { status: true } }
        }
      });
      let reason = "Not eligible for matchmaking";
      if (!user) reason = "User not found";
      else if (user.isBanned) reason = "Account is banned";
      else if (!user.is18PlusVerified) reason = "Age verification required (18+)";
      else if (user.subscription?.status !== "ACTIVE") reason = "Active subscription required";
      throw new UnauthorizedException(reason);
    }
    
    // Get user location if not provided
    if (latitude === undefined || longitude === undefined) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { latitude: true, longitude: true }
      });
      latitude = user?.latitude ?? undefined;
      longitude = user?.longitude ?? undefined;
    }
    
    const key = this.queueKey(region, language);
    
    // Remove user from queue first to prevent duplicates
    await this.leaveQueue(userId);
    
    const redis = this.ensureRedis();
    const payload: QueueRequest = { userId, region, language, latitude, longitude, enqueuedAt: Date.now() };
    await redis.rpush(key, JSON.stringify(payload));
    this.userQueues.set(userId, { key, addedAt: Date.now() });
    
    // Try to find the closest match
    const match = await this.findClosestMatch(userId, key, latitude, longitude);
    if (match) {
      return match;
    }
    
    const redisClient = this.ensureRedis();
    const length = await redisClient.llen(key);
    console.log(`User ${userId} joined queue ${key}. Queue length: ${length}`);
    return null;
  }

  async leaveQueue(userId: string) {
    // Try to get queue key from map first
    const entry = this.userQueues.get(userId);
    let key = entry?.key;
    
    // If not in map, dynamically find all queue keys using Redis KEYS command
    if (!key) {
      try {
        // Get all queue keys dynamically (handles any region/language combo)
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
            } catch {
              continue;
            }
          }
          if (key) break;
        }
      } catch (err) {
        console.error("[Matchmaking] Error scanning queues:", err);
      }
    }
    
    if (!key) return; // User not in any queue
    
    // Remove ALL occurrences of this user from the queue (handle duplicates)
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
      } catch {
        continue;
      }
    }
    
    if (removed > 0) {
      console.log(`[Matchmaking] Removed ${removed} queue entry/entries for user ${userId} from ${key}`);
    }
    
    this.userQueues.delete(userId);
  }

  async findMatch(userId: string, region: string, language: string, latitude?: number, longitude?: number): Promise<[QueueRequest, QueueRequest] | null> {
    const key = this.queueKey(region, language);
    return this.findClosestMatch(userId, key, latitude, longitude);
  }

  private async findClosestMatch(userId: string, queueKey: string, userLat?: number, userLon?: number): Promise<[QueueRequest, QueueRequest] | null> {
    const redisClient = this.ensureRedis();
    const length = await redisClient.llen(queueKey);
    console.log(`[Matchmaking] findClosestMatch for ${userId}, queue length: ${length}`);
    if (length < 2) {
      console.log(`[Matchmaking] Queue too short (${length} < 2)`);
      return null;
    }

    // Get all users in queue
    const allItems = await redisClient.lrange(queueKey, 0, -1);
    console.log(`[Matchmaking] Found ${allItems.length} items in queue`);
    const queueRequests: Array<{ request: QueueRequest; distance: number }> = [];
    
    for (const item of allItems) {
      try {
        const request = JSON.parse(item) as QueueRequest;
        if (request.userId === userId) {
          console.log(`[Matchmaking] Skipping self: ${userId}`);
          continue; // Skip self
        }
        
        // Verify user is still eligible
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
      } catch (e) {
        console.error(`[Matchmaking] Error parsing queue item:`, e);
        continue;
      }
    }
    
    if (queueRequests.length === 0) {
      console.log(`[Matchmaking] No eligible matches found`);
      return null;
    }
    
    // Sort by distance (closest first)
    queueRequests.sort((a, b) => a.distance - b.distance);
    
    // Get the closest match
    const closestMatch = queueRequests[0].request;
    console.log(`[Matchmaking] Closest match: ${closestMatch.userId} (distance: ${queueRequests[0].distance})`);
    
    // Find current user's request
    let currentUserRequest: QueueRequest | null = null;
    let currentUserJson: string | null = null;
    for (const item of allItems) {
      try {
        const request = JSON.parse(item) as QueueRequest;
        if (request.userId === userId) {
          currentUserRequest = request;
          currentUserJson = item; // Keep original JSON to ensure exact match
          break;
        }
      } catch {
        continue;
      }
    }
    
    if (!currentUserRequest || !currentUserJson) {
      console.log(`[Matchmaking] Current user's request not found in queue`);
      return null;
    }
    
    // Find the exact JSON string for the match user
    let matchUserJson: string | null = null;
    for (const item of allItems) {
      try {
        const request = JSON.parse(item) as QueueRequest;
        if (request.userId === closestMatch.userId) {
          matchUserJson = item;
          break;
        }
      } catch {
        continue;
      }
    }
    
    if (!matchUserJson) {
      console.log(`[Matchmaking] Match user's request not found in queue`);
      return null;
    }
    
    // Use Redis WATCH + MULTI/EXEC for atomic operation
    // This ensures that if the queue changes between our read and write, the transaction fails
    try {
      await redisClient.watch(queueKey);
      
      // Double-check both users are still in queue before removing
      const currentQueueItems = await redisClient.lrange(queueKey, 0, -1);
      const currentUserStillInQueue = currentQueueItems.includes(currentUserJson);
      const matchUserStillInQueue = currentQueueItems.includes(matchUserJson);
      
      if (!currentUserStillInQueue || !matchUserStillInQueue) {
        await redisClient.unwatch();
        console.log(`[Matchmaking] Users no longer in queue (current: ${currentUserStillInQueue}, match: ${matchUserStillInQueue})`);
        return null;
      }
      
      // Execute atomic removal
      const pipeline = redisClient.multi();
      pipeline.lrem(queueKey, 1, currentUserJson);
      pipeline.lrem(queueKey, 1, matchUserJson);
      const results = await pipeline.exec();
      
      // Check if transaction succeeded
      if (!results) {
        // Transaction was aborted due to WATCH - queue was modified
        console.log(`[Matchmaking] Transaction aborted - queue was modified by another process`);
        return null;
      }
      
      // Verify both removals succeeded
      const removed1 = results[0]?.[1] as number;
      const removed2 = results[1]?.[1] as number;
      
      if (removed1 === 0 || removed2 === 0) {
        console.log(`[Matchmaking] Removal failed in transaction (removed1: ${removed1}, removed2: ${removed2})`);
        // Re-add current user if needed
        if (removed1 > 0 && removed2 === 0) {
          await redisClient.rpush(queueKey, currentUserJson);
        }
        return null;
      }
      
      console.log(`[Matchmaking] Successfully matched ${userId} with ${closestMatch.userId} (atomic)`);
    } catch (err) {
      console.error(`[Matchmaking] Transaction error:`, err);
      if (this.redis) {
        await this.redis.unwatch();
      }
      return null;
    }
    this.userQueues.delete(userId);
    this.userQueues.delete(closestMatch.userId);
    
    return [currentUserRequest, closestMatch] as [QueueRequest, QueueRequest];
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  queueKey(region: string, language: string) {
    return `match_queue:${region}:${language}`;
  }

  private async ensureEligible(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isBanned: true,
        is18PlusVerified: true,
        subscription: { select: { status: true } }
      }
    });
    if (!user) return false;
    if (user.isBanned) return false;
    if (!user.is18PlusVerified) return false;
    if (user.subscription?.status !== "ACTIVE") return false;
    return true;
  }
}

