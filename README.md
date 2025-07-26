# grandMA3 TCP OSC Proxy
A lightweight proxy that bridges grandMA3 OSC communication to work with standard OSC 1.1 implementations, solving critical compatibility issues with third-party software.

## 🐞 The Problem

### Bug #1: Missing OSC 1.1 Framing Support  
📡 Although OSC 1.1 is *claimed* to be supported, MA3 software **does not implement SLIP framing** for OSC messages over TCP.  
⚠️ This causes **incompatibility** with third-party software relying on proper OSC 1.1 framing, and **lacking support for legacy OSC 1.0** framing.

### Bug #2: Dual TCP Connections Required
💥 Currently, the **destination IP is mandatory**, forcing users to configure **both a TCP server and client** to avoid system monitor errors.  
🧩 This is unnecessarily complex, considering **TCP natively supports bidirectional communication** over a single connection.  

💡 **Ideal behavior:**
- If **destination IP is not set**, the console should still accept incoming TCP connections.
- If **destination IP *is* set**, the console can attempt to connect outwards.
- ✅ Once *any* connection is established, **no further system errors should appear**, regardless of client/server roles.

## 🔧 The Solution

This proxy provides a **practical workaround** for both issues, easing integration and reducing config headaches by:

- **Converting OSC messages** to proper OSC 1.1 format with SLIP framing
- **Enabling bidirectional communication** over a single TCP connection
- **Supporting both client and server modes** for flexible deployment scenarios

## 🚀 Quick Start

### Prerequisites
- [Deno](https://deno.land/) runtime installed

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/LightYourWay/grandMA3-tcp-osc-proxy.git
   cd grandMA3-tcp-osc-proxy
   ```

2. **Run directly with Deno:**
   ```bash
   # Server mode (proxy listens for connections)
   deno task start server <MA3-IP> <MA3-Port> <Local-Server-Port>
   
   # Client mode (proxy connects to remote server)
   deno task start client <MA3-IP> <MA3-Port> <Remote-Server-IP> <Remote-Server-Port>
   ```

### Usage Examples

#### Server Mode
Start the proxy as a server that your OSC application can connect to:
```bash
deno task start server 192.168.1.100 8000 9000
```
- Connects to MA3 at `192.168.1.100:8000`
- Listens for OSC clients on port `9000`

#### Client Mode  
Start the proxy as a client that connects to your OSC server:
```bash
deno task start client 192.168.1.100 8000 192.168.1.200 9000
```
- Connects to MA3 at `192.168.1.100:8000`
- Connects to your OSC server at `192.168.1.200:9000`

#### Development Mode
For development with auto-reload:
```bash
deno task dev
```

#### Verbose Output
Enable detailed logging:
```bash
deno task start --verbose server 192.168.1.100 8000 9000
```

## 📦 Building Executables

Build standalone executables for different platforms:

```bash
# Build for all platforms
deno task build

# Or build for specific platforms
deno task build:win          # Windows x86_64
deno task build:macos:arm64   # macOS Apple Silicon
deno task build:macos:x86_64  # macOS Intel
deno task build:linux:arm64   # Linux ARM64
deno task build:linux:x86_64  # Linux x86_64
```

Executables will be created in the `dist/` directory.

## 🏗️ Architecture

The proxy consists of several key components:

- **`Proxy`** - Main orchestrator that manages connections between MA3 and remote endpoints
- **`MA3`** - Handles connection and communication with grandMA3 console
- **`Server`** - TCP server implementation for accepting client connections
- **`Client`** - TCP client implementation for connecting to remote servers
- **`OSCEncoder`/`OSCDecoder`** - Handles OSC message format conversion

### Message Flow

```
[Third-party OSC App] ←→ [Proxy] ←→ [grandMA3]
                           ↑
                    Converts between
                   OSC 1.0 ↔ OSC 1.1
```

## 🛠️ Configuration

### Command Line Options

- `--verbose, -v` - Enable detailed logging output
- `--help` - Show help information
- `--version` - Show version information

### Modes

#### Server Mode
```
ma3-tcp-osc-proxy server <MA3-IP> <MA3-Port> <Local-Server-Port>
```
- **MA3-IP**: IP address of the grandMA3 console
- **MA3-Port**: OSC port on the grandMA3 console (typically 8000-8015)
- **Local-Server-Port**: Port for the proxy to listen on

#### Client Mode
```
ma3-tcp-osc-proxy client <MA3-IP> <MA3-Port> <Remote-Server-IP> <Remote-Server-Port>
```
- **MA3-IP**: IP address of the grandMA3 console
- **MA3-Port**: OSC port on the grandMA3 console
- **Remote-Server-IP**: IP address of your OSC server
- **Remote-Server-Port**: Port of your OSC server

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **🔗 Full Changelog**: [GitHub v0.1.0 Commits](https://github.com/LightYourWay/grandMA3-tcp-osc-proxy/commits/v0.1.0)
- **🐛 Report Issues**: [GitHub Issues](https://github.com/LightYourWay/grandMA3-tcp-osc-proxy/issues)
- **📖 grandMA3 OSC Documentation**: [MA Lighting Documentation](https://help.malighting.com/grandMA3/2.2/HTML/remote_inputs_osc.html)

---

*Built with [Deno](https://deno.land/) 🦕*
