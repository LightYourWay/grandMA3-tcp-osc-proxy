import { Listener } from "../interfaces/Listener.ts";
import { OSCDecoder, OSCMessage } from "./OSCDecoder.ts";
import { OSCEncoder } from "./OSCEncoder.ts";
import { settings } from "./Settings.ts";

interface ServerProperties {
  port: number;
}

export class Server implements ServerProperties {
  port: number;
  socket: Deno.Listener | undefined;
  connection: Deno.Conn | undefined;
  listener: Listener | undefined;
  disconnected = true;

  remoteIP: string | undefined;
  remotePort: number | undefined;

  constructor(properties: ServerProperties) {
    this.port = properties.port;
  }

  async connect() {
    if (this.socket) {
      // console.error("Server is already running on port", this.port);
      return;
    }

    this.socket = Deno.listen({ port: this.port });

    try {
      while (this.socket) {
        const conn = await this.socket.accept();
        this.connection = conn;

        if (conn.remoteAddr.transport === "tcp") {
          this.remoteIP = conn.remoteAddr.hostname;
          this.remotePort = conn.remoteAddr.port;
        }

        this.disconnected = false;

        this.listener?.connected?.(
          this.remoteIP || "unknown",
          this.remotePort || 0,
        );

        await conn.readable.pipeTo(
          new WritableStream({
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
              }
            },
          }),
        ).catch(async (err) => {
          if (err) {
            // console.log("Connection closed or errored:", err);
          }
          if (!this.disconnected) {
            this.listener?.disconnected?.(
              this.remoteIP || "unknown",
              this.remotePort || 0,
            );

            await new Promise((resolve) => setTimeout(resolve, 1000));
            this.connect();
          }
        }).finally(() => {
          if (!this.disconnected) {
            this.listener?.disconnected?.(
              this.remoteIP || "unknown",
              this.remotePort || 0,
            );
            conn.close();
            this.connection = undefined;
          }
        });
      }
    } catch (err) {
      if (err instanceof Deno.errors.BadResource) {
        // console.log("Listener was closed");
      } else {
        // console.error("Accept loop error:", err);
      }
      if (!this.disconnected) {
        if (this.socket) {
          try {
            this.socket.close();
          } catch (err) {
            console.error("Error closing socket:", err);
          }
          this.socket = undefined;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
        this.connect();
      }
    }
  }

  disconnect() {
    this.disconnected = true;
    if (this.connection) {
      try {
        this.connection.close();
      } catch (err) {
        console.error("Error closing connection:", err);
      }
      this.connection = undefined;
    }

    if (this.socket) {
      try {
        this.socket.close();
      } catch (err) {
        console.error("Error closing socket:", err);
      }
      this.socket = undefined;
    }

    this.listener?.disconnected?.(
      this.remoteIP || "unknown",
      this.remotePort || 0,
    );
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
