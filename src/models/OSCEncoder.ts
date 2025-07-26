// OSC Message encoder with optional SLIP framing
import { OSCMessage } from './OSCDecoder.ts';

// OSC argument types
type OSCArgument = number | string | boolean | null | Uint8Array;

export interface OSCEncoderOptions {
    useSlip?: boolean;
}

export class OSCEncoder {
    private useSlip: boolean = false;

    // SLIP constants
    private static readonly SLIP_END = 0xC0;     // 192
    private static readonly SLIP_ESC = 0xDB;     // 219
    private static readonly SLIP_ESC_END = 0xDC; // 220
    private static readonly SLIP_ESC_ESC = 0xDD; // 221

    constructor(options: OSCEncoderOptions = {}) {
        this.useSlip = options.useSlip || false;
    }

    // Pad data to 4-byte boundary
    private padTo4Bytes(data: Uint8Array): Uint8Array {
        const remainder = data.length % 4;
        if (remainder === 0) {
            return data;
        }
        
        const paddingLength = 4 - remainder;
        const padded = new Uint8Array(data.length + paddingLength);
        padded.set(data);
        // Zero padding is already in place due to Uint8Array initialization
        return padded;
    }

    // Encode string with null termination and OSC padding
    private encodeString(str: string): Uint8Array {
        const encoder = new TextEncoder();
        const stringBytes = encoder.encode(str);
        
        // Add null terminator
        const withNull = new Uint8Array(stringBytes.length + 1);
        withNull.set(stringBytes);
        withNull[stringBytes.length] = 0;
        
        // Pad to 4-byte boundary
        return this.padTo4Bytes(withNull);
    }

    // Encode 32-bit integer (big-endian)
    private encodeInt32(value: number): Uint8Array {
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        view.setInt32(0, value, false); // big-endian
        return new Uint8Array(buffer);
    }

    // Encode 32-bit float (big-endian)
    private encodeFloat32(value: number): Uint8Array {
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        view.setFloat32(0, value, false); // big-endian
        return new Uint8Array(buffer);
    }

    // Encode blob with size prefix and padding
    private encodeBlob(data: Uint8Array): Uint8Array {
        const sizeBytes = this.encodeInt32(data.length);
        const paddedData = this.padTo4Bytes(data);
        
        const result = new Uint8Array(sizeBytes.length + paddedData.length);
        result.set(sizeBytes);
        result.set(paddedData, sizeBytes.length);
        
        return result;
    }

    // Apply SLIP encoding
    private applySlip(data: Uint8Array): Uint8Array {
        const encoded: number[] = [];
        
        // Start with SLIP_END
        encoded.push(OSCEncoder.SLIP_END);
        
        // Encode each byte
        for (let i = 0; i < data.length; i++) {
            const byte = data[i];
            if (byte === OSCEncoder.SLIP_END) {
                encoded.push(OSCEncoder.SLIP_ESC, OSCEncoder.SLIP_ESC_END);
            } else if (byte === OSCEncoder.SLIP_ESC) {
                encoded.push(OSCEncoder.SLIP_ESC, OSCEncoder.SLIP_ESC_ESC);
            } else {
                encoded.push(byte);
            }
        }
        
        // End with SLIP_END
        encoded.push(OSCEncoder.SLIP_END);
        
        return new Uint8Array(encoded);
    }

    // Generate type tag string from arguments
    private generateTypeTag(args: OSCArgument[]): string {
        let typeTag = ',';
        
        for (const arg of args) {
            if (typeof arg === 'number') {
                // Check if it's an integer or float
                if (Number.isInteger(arg)) {
                    typeTag += 'i';
                } else {
                    typeTag += 'f';
                }
            } else if (typeof arg === 'string') {
                typeTag += 's';
            } else if (typeof arg === 'boolean') {
                typeTag += arg ? 'T' : 'F';
            } else if (arg === null) {
                typeTag += 'N';
            } else if (arg instanceof Uint8Array) {
                typeTag += 'b';
            } else {
                throw new Error(`Unsupported argument type: ${typeof arg}`);
            }
        }
        
        return typeTag;
    }

    // Encode OSC message
    encode(message: OSCMessage | { address: string; args: OSCArgument[] }, options?: OSCEncoderOptions): Uint8Array {
        try {
            // Use provided options or instance options
            const shouldUseSlip = options?.useSlip !== undefined ? options.useSlip : this.useSlip;
            
            // Extract message properties
            const address = message.address;
            const args = message.args || [];
            
            // Generate type tag if not provided
            const typeTag = 'typeTag' in message && message.typeTag 
                ? message.typeTag 
                : this.generateTypeTag(args);
            
            // Encode address
            const addressBytes = this.encodeString(address);
            
            // Encode type tag
            const typeTagBytes = this.encodeString(typeTag);
            
            // Encode arguments
            const argBytes: Uint8Array[] = [];
            let argIndex = 0;
            
            for (let i = 1; i < typeTag.length; i++) {
                const type = typeTag[i];
                const arg = args[argIndex];
                
                switch (type) {
                    case 'i': // int32
                        if (typeof arg !== 'number' || !Number.isInteger(arg)) {
                            throw new Error(`Expected integer for type 'i', got ${typeof arg}`);
                        }
                        argBytes.push(this.encodeInt32(arg));
                        break;
                    case 'f': // float32
                        if (typeof arg !== 'number') {
                            throw new Error(`Expected number for type 'f', got ${typeof arg}`);
                        }
                        argBytes.push(this.encodeFloat32(arg));
                        break;
                    case 's': // string
                        if (typeof arg !== 'string') {
                            throw new Error(`Expected string for type 's', got ${typeof arg}`);
                        }
                        argBytes.push(this.encodeString(arg));
                        break;
                    case 'b': // blob
                        if (!(arg instanceof Uint8Array)) {
                            throw new Error(`Expected Uint8Array for type 'b', got ${typeof arg}`);
                        }
                        argBytes.push(this.encodeBlob(arg));
                        break;
                    case 'T': // true
                    case 'F': // false
                    case 'N': // null
                        // These types have no data, just the type tag
                        break;
                    default:
                        throw new Error(`Unknown OSC type tag: ${type}`);
                }
                
                // Only increment for types that consume arguments
                if (type !== 'T' && type !== 'F' && type !== 'N') {
                    argIndex++;
                }
            }
            
            // Calculate total length
            const totalLength = addressBytes.length + typeTagBytes.length + 
                argBytes.reduce((sum, bytes) => sum + bytes.length, 0);
            
            // Combine all parts
            const oscData = new Uint8Array(totalLength);
            let offset = 0;
            
            oscData.set(addressBytes, offset);
            offset += addressBytes.length;
            
            oscData.set(typeTagBytes, offset);
            offset += typeTagBytes.length;
            
            for (const bytes of argBytes) {
                oscData.set(bytes, offset);
                offset += bytes.length;
            }
            
            // Apply SLIP framing if requested
            if (shouldUseSlip) {
                return this.applySlip(oscData);
            }
            
            return oscData;
        } catch (error) {
            console.error('OSC encode error:', error);
            throw error;
        }
    }

    // Convenience method to create and encode a message
    static encode(address: string, args: OSCArgument[] = [], options?: OSCEncoderOptions): Uint8Array {
        const encoder = new OSCEncoder(options);
        return encoder.encode({ address, args });
    }

    // Set SLIP usage for future encodes
    setUseSlip(useSlip: boolean): void {
        this.useSlip = useSlip;
    }
}
