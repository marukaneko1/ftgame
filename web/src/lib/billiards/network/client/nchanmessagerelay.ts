// @ts-nocheck
import { MessageRelay } from "./messagerelay";

// Stub NchanMessageRelay - will be replaced with WebSocket integration
export class NchanMessageRelay implements MessageRelay {
  subscribe(tableId: string, callback: (event: any) => void): void {
    // Stub - will be replaced with WebSocket subscription
  }

  publish(tableId: string, event: any): void {
    // Stub - will be replaced with WebSocket publish
  }
}



