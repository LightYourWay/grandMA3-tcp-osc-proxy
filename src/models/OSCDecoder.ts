import { settings } from "./Settings.ts";

// OSC Message structure and decoder
type OSCArgument = number | string | boolean | null | Uint8Array;

export interface OSCMessage {
    address: string;
    typeTag: string;
    args: OSCArgument[];
    usedSlip: boolean;
}

export class OSCDecoder {
    private view: DataView;
    private offset: number = 0;
    private usedSlip: boolean = false;

    // SLIP constants
    private static readonly SLIP_END = 0xC0;     // 192
    private static readonly SLIP_ESC = 0xDB;     // 219
    private static readonly SLIP_ESC_END = 0xDC; // 220
    private static readonly SLIP_ESC_ESC = 0xDD; // 221

    constructor(buffer: ArrayBufferLike) {
        this.view = new DataView(buffer);
        this.offset = 0;
    }

    // Detect and strip SLIP framing
    private stripSlip(buffer: ArrayBufferLike): ArrayBufferLike {
        const view = new DataView(buffer);
        const length = view.byteLength;
        
        // Check if buffer starts and ends with SLIP_END
        if (length < 2) {
            return buffer;
        }
        
        const startsWithSlipEnd = view.getUint8(0) === OSCDecoder.SLIP_END;
        const endsWithSlipEnd = view.getUint8(length - 1) === OSCDecoder.SLIP_END;
        
        if (!startsWithSlipEnd && !endsWithSlipEnd) {
            // No SLIP framing detected
            return buffer;
        }
        
        this.usedSlip = true;
        
        // Determine start and end positions
        const start = startsWithSlipEnd ? 1 : 0;
        const end = endsWithSlipEnd ? length - 1 : length;
        
        // Extract the payload between SLIP_END markers
        const payload = new Uint8Array(buffer, start, end - start);
        
        // Decode SLIP escape sequences
        const decoded: number[] = [];
        for (let i = 0; i < payload.length; i++) {
            const byte = payload[i];
            if (byte === OSCDecoder.SLIP_ESC && i + 1 < payload.length) {
                const nextByte = payload[i + 1];
                if (nextByte === OSCDecoder.SLIP_ESC_END) {
                    decoded.push(OSCDecoder.SLIP_END);
                    i++; // skip next byte
                } else if (nextByte === OSCDecoder.SLIP_ESC_ESC) {
                    decoded.push(OSCDecoder.SLIP_ESC);
                    i++; // skip next byte
                } else {
                    // Invalid escape sequence, keep as is
                    decoded.push(byte);
                }
            } else {
                decoded.push(byte);
            }
        }
        
        return new Uint8Array(decoded).buffer;
    }

    // Read null-terminated string with OSC padding (multiple of 4 bytes)
    private readString(): string {
        const start = this.offset;
        let end = start;
        
        // Find null terminator
        while (end < this.view.byteLength && this.view.getUint8(end) !== 0) {
            end++;
        }
        
        const str = new TextDecoder().decode(new Uint8Array(this.view.buffer, start, end - start));
        
        // Move past the string and padding to next 4-byte boundary
        this.offset = Math.ceil((end + 1) / 4) * 4;
        
        return str;
    }

    private readInt32(): number {
        const value = this.view.getInt32(this.offset, false); // big-endian
        this.offset += 4;
        return value;
    }

    private readFloat32(): number {
        const value = this.view.getFloat32(this.offset, false); // big-endian
        this.offset += 4;
        return value;
    }

    private readBlob(): Uint8Array {
        const size = this.readInt32();
        const data = new Uint8Array(this.view.buffer, this.offset, size);
        // Move past data and padding to next 4-byte boundary
        this.offset = Math.ceil((this.offset + size) / 4) * 4;
        return data;
    }

    decode(inputBuffer?: ArrayBufferLike): OSCMessage | null {
        try {
            // Use the provided buffer or the constructor buffer
            const buffer = inputBuffer || this.view.buffer;
            
            // Reset slip tracking
            this.usedSlip = false;
            
            // Strip SLIP framing if present
            const cleanBuffer = this.stripSlip(buffer);
            
            // Update view with clean buffer and reset offset
            this.view = new DataView(cleanBuffer);
            this.offset = 0;
            
            // Read address pattern
            const address = this.readString();
            
            // Read type tag string (should start with ',')
            const typeTag = this.readString();
            
            if (!typeTag.startsWith(',')) {
                if (settings.verbose) console.error('Invalid OSC type tag:', typeTag);
                return null;
            }

            // Parse arguments based on type tag
            const args: OSCArgument[] = [];
            for (let i = 1; i < typeTag.length; i++) {
                const type = typeTag[i];
                switch (type) {
                    case 'i': // int32
                        args.push(this.readInt32());
                        break;
                    case 'f': // float32
                        args.push(this.readFloat32());
                        break;
                    case 's': // string
                        args.push(this.readString());
                        break;
                    case 'b': // blob
                        args.push(this.readBlob());
                        break;
                    case 'T': // true
                        args.push(true);
                        break;
                    case 'F': // false
                        args.push(false);
                        break;
                    case 'N': // null
                        args.push(null);
                        break;
                    default:
                        if (settings.verbose) console.warn(`Unknown OSC type tag: ${type}`);
                        break;
                }
            }

            return {
                address,
                typeTag,
                args,
                usedSlip: this.usedSlip
            };
        } catch (_error) {
            if (settings.verbose) console.error('OSC decode error:', _error);
            return null;
        }
    }
}