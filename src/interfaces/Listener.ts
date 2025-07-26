import { OSCMessage } from "../models/OSCDecoder.ts";

export interface Listener {
  connecting?(remoteIP: string, remotePort: number): void;
  connected?(remoteIP: string, remotePort: number): void;
  messageReceived?(oscMessage: OSCMessage): void;
  disconnected?(remoteIP: string, remotePort: number): void;
}
