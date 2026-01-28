// @ts-nocheck
// Stub Session class for compatibility
export class Session {
  private static instance: Session | null = null;
  private static clientId: string = "";
  private static playername: string = "";
  private static tableId: string = "";
  private static spectator: boolean = false;

  static init(clientId: string, playername: string, tableId: string, spectator: boolean) {
    Session.clientId = clientId;
    Session.playername = playername;
    Session.tableId = tableId;
    Session.spectator = spectator;
    Session.instance = new Session();
  }

  static getInstance(): Session {
    if (!Session.instance) {
      Session.instance = new Session();
    }
    return Session.instance;
  }

  static isSpectator(): boolean {
    return Session.spectator;
  }

  get clientId(): string {
    return Session.clientId;
  }

  get playername(): string {
    return Session.playername;
  }

  get tableId(): string {
    return Session.tableId;
  }
}







