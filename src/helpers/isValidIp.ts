import { isIPv4 } from "node:net";

export function isValidIp(ip: string): boolean {
    return isIPv4(ip);
}