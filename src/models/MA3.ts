import { Listener } from "../interfaces/Listener.ts";
import { Client } from "./Client.ts";
import { OSCMessage } from "./OSCDecoder.ts";
import { Server } from "./Server.ts";

interface MA3Properties {
  ip: string;
  port: number;
}

export class MA3 implements MA3Properties {
  ip: string;
  port: number;
  client: Client | undefined;
  server: Server | undefined;
  listener: Listener | undefined;

  constructor(properties: MA3Properties) {
    this.ip = properties.ip;
    this.port = properties.port;
  }

  async connect() {
    this.client = new Client({
      remoteIP: this.ip,
      remotePort: this.port,
    });

    this.server = new Server({
      port: this.port,
    });

    this.client.registerListener({
      connecting: (remoteIP, remotePort) => {
        this.server?.connect();
        this.listener?.connecting?.(remoteIP, remotePort);
      },
      connected: this.listener?.connected,
      messageReceived: this.listener?.messageReceived,
      disconnected: (remoteIP, remotePort) => {
        this.server?.disconnect();
        this.listener?.disconnected?.(remoteIP, remotePort);
      },
    });

    await this.client.connect();
  }

  registerListener(listener: Listener) {
    this.listener = listener;
  }

  sendMessage(oscMessage: OSCMessage) {
    this.client?.sendMessage(oscMessage, false);
  }
}
