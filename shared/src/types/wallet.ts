export type WalletTransactionType =
  | "purchase"
  | "gift_sent"
  | "gift_received"
  | "wager_lock"
  | "wager_payout"
  | "refund";

export interface WalletSummary {
  id: string;
  balanceTokens: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransactionSummary {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  amountTokens: number;
  createdAt: string;
  metadata?: Record<string, unknown>;
}


