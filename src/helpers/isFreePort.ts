import { checkPort } from "@openjs/port-free";

export async function isFreePort(port: number) {
    return await checkPort(port);
}