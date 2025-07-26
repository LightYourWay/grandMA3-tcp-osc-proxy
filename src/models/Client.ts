import { Listener } from "../interfaces/Listener.ts";
import { OSCDecoder, OSCMessage } from "./OSCDecoder.ts";
import { OSCEncoder } from "./OSCEncoder.ts";
import { settings } from "./Settings.ts";

interface ClientProperties {
  remoteIP: string;
  remotePort: number;
}

export class Client implements ClientProperties {
  remoteIP: string;
  remotePort: number;
  connection: Deno.Conn | undefined;
  listener: Listener | undefined;
  disconnected = true;

  constructor(properties: ClientProperties) {
    this.remoteIP = properties.remoteIP;
    this.remotePort = properties.remotePort;
  }

  async connect() {
    this.listener?.connecting?.(this.remoteIP, this.remotePort);

    this.connection = undefined;

    while (!this.connection) {
      try {
        this.connection = await Deno.connect({
          hostname: this.remoteIP,
          port: this.remotePort,
        });
      } catch (_error) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    this.connection.readable.pipeTo(
      new WritableStream({
        start: () => {
          this.disconnected = false;
          this.listener?.connected?.(this.remoteIP, this.remotePort);
        },
        write: (chunk: Uint8Array) => {
          const buffer = chunk.buffer.slice(
            chunk.byteOffset,
            chunk.byteOffset + chunk.byteLength,
          );
          const decoder = new OSCDecoder(buffer);
          const oscMessage = decoder.decode(buffer);

          if (oscMessage) {
            this.listener?.messageReceived?.(oscMessage);
          } else {
            if (settings.verbose) console.error("Failed to decode as OSC message");
            if (settings.verbose) console.error("Server - received raw chunk:", chunk);
            if (settings.verbose) console.error("As text:", new TextDecoder().decode(chunk));
          }
        },
      }),
    ).catch(() => {}).finally(async () => {
      if (!this.disconnected) {
        this.listener?.disconnected?.(this.remoteIP, this.remotePort);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        this.connect();
      }
    });
  }

  disconnect() {
    if (this.connection) {
      this.connection.close();
      this.listener?.disconnected?.(this.remoteIP, this.remotePort);
      this.connection = undefined;
    }

    this.disconnected = true;
  }

  registerListener(listener: Listener) {
    this.listener = listener;
  }

  sendMessage(oscMessage: OSCMessage, useSlip: boolean = true) {
    const encoder = new OSCEncoder({ useSlip });
    const encodedMessage = encoder.encode(oscMessage);

    if (this.connection) {
      this.connection.write(encodedMessage).catch((error) => {
        console.error("Failed to send OSC message:", error);
      });
    } else {
      console.error("No active connection to send OSC message");
    }
  }
}
