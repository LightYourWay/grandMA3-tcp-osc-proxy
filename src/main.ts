// TODO:
// - user must input ip address and port of MA3
// - user must run app in client or server moode
// - if run in client mode, app must connect to specified TCP Server on specified port
// - if run in server mode, app must listen for incoming connections on specified port

import { Command, ValidationError } from "@cliffy/command";
import { Proxy } from "./models/Proxy.ts";
import { MA3 } from "./models/MA3.ts";
import { Server } from "./models/Server.ts";
import { Client } from "./models/Client.ts";
import { isValidIp } from "./helpers/isValidIp.ts";
import { isValidPort } from "./helpers/isValidPort.ts";
import { isFreePort } from "./helpers/isFreePort.ts";
import { settings } from "./models/Settings.ts";

const serverCommand = new Command()
  .arguments("<MA3-IP:string> <MA3-Port:number> <Local-Server-Port:number>")
  .description("Starts the grandMA3 TCP OSC Proxy in server mode.")
  .action(async (_: unknown, mIp: string, mPort: number, lPort: number) => {
    if (!isValidIp(mIp)) {
      throw new ValidationError(
        `Invalid MA3 IP: ${mIp}. Please provide a valid IPv4 address.`,
      );
    }

    if (!isValidPort(mPort)) {
      throw new ValidationError(
        `Invalid MA3 Port: ${mPort}. Please provide a port number between 0 and 65535.`,
      );
    }

    if (!isValidPort(lPort)) {
      throw new ValidationError(
        `Invalid Local Server Port: ${lPort}. Please provide a port number between 0 and 65535.`,
      );
    }

    if (!await isFreePort(lPort)) {
      throw new ValidationError(
        `Invalid Local Server Port: ${lPort} is already in use. Please choose a different port.`,
      );
    }

    new Proxy({
      ma3: new MA3({
        ip: mIp,
        port: mPort,
      }),
      remote: new Server({
        port: lPort,
      }),
    });
  });

const clientCommand = new Command()
  .arguments(
    "<MA3-IP:string> <MA3-Port:number> <Remote-Server-IP:string> <Remote-Server-Port:number>",
  )
  .description("Starts the grandMA3 TCP OSC Proxy in client mode.")
  .action(
    (_: unknown, mIP: string, mPort: number, rIP: string, rPort: number) => {
      if (!isValidIp(mIP)) {
        throw new ValidationError(
          `Invalid MA3 IP: ${mIP}. Please provide a valid IPv4 address.`,
        );
      }

      if (!isValidPort(mPort)) {
        throw new ValidationError(
          `Invalid MA3 Port: ${mPort}. Please provide a port number between 0 and 65535.`,
        );
      }

      if (!isValidIp(rIP)) {
        throw new ValidationError(
          `Invalid Remote Server IP: ${rIP}. Please provide a valid IPv4 address.`,
        );
      }

      if (!isValidPort(rPort)) {
        throw new ValidationError(
          `Invalid Remote Server Port: ${rPort}. Please provide a port number between 0 and 65535.`,
        );
      }

      new Proxy({
        ma3: new MA3({
          ip: mIP,
          port: mPort,
        }),
        remote: new Client({
          remoteIP: rIP,
          remotePort: rPort,
        }),
      });
    },
  );

async function main() {
  const { options } = await new Command()
    .name("ma3-tcp-osc-proxy")
    .description(
      "Proxies the MA3's OSC traffic to conform to OSC 1.1 and be forwarded to any TCP Client or Server.",
    )
    .version("v0.1.0")
    .usage("[options] <client|server> [args...]")
    .action(function (this: Command) {
      this.showHelp();
    })
    .globalOption("-v, --verbose", "Enable verbose output")
    .command("server", serverCommand)
    .command("client", clientCommand)
    .parse(Deno.args);

  settings.verbose = options.verbose as boolean ?? false;
}

if (import.meta.main) {
  await main();
}