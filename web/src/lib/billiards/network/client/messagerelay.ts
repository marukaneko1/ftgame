// @ts-nocheck
// Message relay interface
export interface MessageRelay {
  subscribe(tableId: string, callback: (event: any) => void): void;
  publish(tableId: string, event: any): void;
}







