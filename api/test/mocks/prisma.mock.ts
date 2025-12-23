import { jest } from "@jest/globals";
import { SubscriptionStatus, WalletTransactionType, WagerStatus } from "@prisma/client";

type UserRecord = {
  id: string;
  email: string;
  passwordHash?: string | null;
  googleId?: string | null;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  is18PlusVerified?: boolean;
  isBanned?: boolean;
};

export function createPrismaMock() {
  const users = new Map<string, UserRecord>();
  const subscriptions = new Map<string, any>();
  const wallets = new Map<string, { balanceTokens: number; transactions: any[]; id: string }>();
  const refreshTokens: any[] = [];
  const wagers = new Map<string, any>();

  const prisma: any = {
    user: {
      findUnique: jest.fn(async ({ where, select }) => {
        let found: UserRecord | null = null;
        if (where.email) found = [...users.values()].find((u) => u.email === where.email) || null;
        else if (where.username) found = [...users.values()].find((u) => u.username === where.username) || null;
        else if (where.id) found = users.get(where.id) || null;
        if (!found) return null;
        if (!select) return found;
        const result: any = {};
        for (const key of Object.keys(select)) {
          if (key === "subscription") {
            result.subscription = subscriptions.get(found.id) || null;
          } else {
            result[key] = (found as any)[key];
          }
        }
        return result;
      }),
      findFirst: jest.fn(async ({ where }) => {
        const match = [...users.values()].find(
          (u) => (where.OR?.[0]?.googleId && u.googleId === where.OR?.[0]?.googleId) || u.email === where.OR?.[1]?.email
        );
        return match || null;
      }),
      create: jest.fn(async ({ data }) => {
        const id = `user-${users.size + 1}`;
        const record: UserRecord = {
          id,
          email: data.email,
          passwordHash: data.passwordHash,
          googleId: data.googleId,
          displayName: data.displayName,
          username: data.username,
          avatarUrl: data.avatarUrl,
          is18PlusVerified: data.is18PlusVerified ?? false,
          isBanned: false
        };
        users.set(id, record);
        if (data.wallet?.create) {
          wallets.set(id, { balanceTokens: 0, transactions: [], id: `wallet-${id}` });
        }
        if (data.subscription?.create) {
          subscriptions.set(id, { userId: id, status: SubscriptionStatus.INACTIVE });
        }
        return record;
      }),
      update: jest.fn(async ({ where, data }) => {
        const record = users.get(where.id);
        if (!record) throw new Error("User not found");
        users.set(where.id, { ...record, ...data });
        return users.get(where.id);
      })
    },
    subscription: {
      findUnique: jest.fn(async ({ where }) => subscriptions.get(where.userId) || null),
      upsert: jest.fn(async ({ where, create, update }) => {
        if (subscriptions.has(where.userId)) {
          const current = subscriptions.get(where.userId);
          const updated = { ...current, ...update };
          subscriptions.set(where.userId, updated);
          return updated;
        }
        const created = { ...create, status: SubscriptionStatus.INACTIVE };
        subscriptions.set(where.userId, created);
        return created;
      }),
      update: jest.fn(async ({ where, data }) => {
        const current = subscriptions.get(where.userId);
        const updated = { ...current, ...data };
        subscriptions.set(where.userId, updated);
        return updated;
      })
    },
    wallet: {
      upsert: jest.fn(async ({ where }) => {
        if (wallets.has(where.userId)) return wallets.get(where.userId);
        const created = { balanceTokens: 0, transactions: [], id: `wallet-${where.userId}` };
        wallets.set(where.userId, created);
        return created;
      }),
      findUnique: jest.fn(async ({ where }) => {
        const wallet = wallets.get(where.userId);
        if (!wallet) return null;
        return { ...wallet };
      }),
      update: jest.fn(async ({ where, data, include }) => {
        const wallet = wallets.get(where.userId);
        if (!wallet) throw new Error("Wallet not found");
        const increment = data.balanceTokens?.increment ?? 0;
        const decrement = data.balanceTokens?.decrement ?? 0;
        wallet.balanceTokens += increment;
        wallet.balanceTokens -= decrement;
        if (wallet.balanceTokens < 0) throw new Error("Negative balance");
        if (data.transactions?.create) {
          wallet.transactions.unshift({ id: `txn-${wallet.transactions.length + 1}`, ...data.transactions.create });
        }
        wallets.set(where.userId, wallet);
        return include?.transactions ? { ...wallet } : wallet;
      })
    },
    refreshToken: {
      create: jest.fn(async ({ data }) => {
        const record = { id: `rt-${refreshTokens.length + 1}`, ...data };
        refreshTokens.push(record);
        return record;
      }),
      findMany: jest.fn(async ({ where }) => {
        return refreshTokens.filter(
          (t) =>
            (!where.revokedAt || t.revokedAt === null) &&
            (!where.expiresAt || t.expiresAt > where.expiresAt.gt)
        );
      }),
      updateMany: jest.fn(async ({ where, data }) => {
        refreshTokens.forEach((t) => {
          if (t.userId === where.userId && (!where.tokenHash || t.tokenHash === where.tokenHash)) {
            t.revokedAt = data.revokedAt;
          }
        });
        return { count: 1 };
      })
    },
    walletTransaction: {},
    wager: {
      findUnique: jest.fn(async ({ where }) => wagers.get(where.id) || null),
      update: jest.fn(async ({ where, data }) => {
        const existing = wagers.get(where.id);
        const updated = { ...existing, ...data };
        wagers.set(where.id, updated);
        return updated;
      })
    },
    $transaction: jest.fn(async (cb: any) => cb(prisma))
  };

  prisma.__stores = { users, subscriptions, wallets, refreshTokens, wagers };
  prisma.__helpers = {
    seedUser(user: UserRecord) {
      users.set(user.id, user);
    },
    seedWager(wager: any) {
      wagers.set(wager.id, wager);
    },
    setSubscription(userId: string, status: SubscriptionStatus) {
      subscriptions.set(userId, { userId, status });
    },
    setWallet(userId: string, balanceTokens: number) {
      wallets.set(userId, { id: `wallet-${userId}`, balanceTokens, transactions: [] });
    }
  };

  return prisma;
}

