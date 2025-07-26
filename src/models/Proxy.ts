import { Client } from "./Client.ts";
import { MA3 } from "./MA3.ts";
import { Server } from "./Server.ts";

interface ProxyProperties {
  ma3: MA3;
  remote: Server | Client;
}

export class Proxy implements ProxyProperties {
  ma3: MA3;
  remote: Server | Client;

  constructor(properties: ProxyProperties) {
    this.ma3 = properties.ma3;
    this.remote = properties.remote;

    this.init();
  }

  async init() {
    this.ma3.registerListener({
      connecting: (remoteIP, remotePort) => {
        console.log(`Connecting to grandMA3 at ${remoteIP}:${remotePort}`);
      },
      disconnected: (remoteIP, remotePort) => {
        console.log(`Disconnected from grandMA3 at ${remoteIP}:${remotePort}`);
        this.remote.disconnect();
      },
      messageReceived: (oscMessage) => {
        this.remote.sendMessage(oscMessage, true);
        // console.log("Received OSC message from MA3:", oscMessage);
      },
      connected: async (remoteIP, remotePort) => {
        console.log(`Connected to MA3 at ${remoteIP}:${remotePort}`);
  
        this.remote.registerListener({
          connecting: (remoteIP, remotePort) => {
            console.log(`Connecting to remote server at ${remoteIP}:${remotePort}`);
          },
          connected: (remoteIP, remotePort) => {
            console.log(`Connected to remote server at ${remoteIP}:${remotePort}`);
          },
          messageReceived: (oscMessage) => {
            this.ma3.sendMessage(oscMessage);
            // console.log("Received OSC message from remote server:", oscMessage);
          },
          disconnected: (remoteIP, remotePort) => {
            console.log(`Disconnected from remote server at ${remoteIP}:${remotePort}`);
          },
        });
        
        await this.remote.connect();
      },
    });

    await this.ma3.connect();
  }
}
