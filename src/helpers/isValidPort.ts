export function isValidPort(port: number): boolean {
    return Number.isInteger(port) && port >= 0 && port <= 65535;
}