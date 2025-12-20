# ConsoleChat.io - Underground Developer Meeting Room

ConsoleChat turns browsers' console into a global real-time chat that connects developers from websites.

## 🚀 Version 2.0.0

Major update with modernized dependencies:
- **Socket.IO 4.8.x** - Latest real-time engine
- **Express 4.21.x** - Latest stable Express
- **Node.js 18+** required

## Installation

Insert these two scripts into your website:

```html
<!-- Socket.IO 4.x Client -->
<script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>

<!-- ConsoleChat Client -->
<script src="https://cdn.consolechat.io/console-chat-min.js"></script>
```

Or use the CDN-hosted version:

```html
<script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
<script src="./path/to/console-chat-min.js"></script>
```

## How it Works

Use these functions in your browser's console:

### 1. Launch the chat
```javascript
cc.start()
```

### 2. Set your username
```javascript
cc.username('YourCoolName')
```

### 3. Say something
```javascript
cc.say('Hello, world!')
```

## All Commands

| Command | Description |
|---------|-------------|
| `cc.start()` | Launch chat |
| `cc.help()` | Get instructions |
| `cc.username("name")` | Set a nickname |
| `cc.public()` | Chat on global channel |
| `cc.onsite()` | Chat only with users on current website |
| `cc.say("message")` | Send a message |
| `cc.msg("user", "message")` | Send a private message |
| `cc.join("channel")` | Join or create a channel |
| `cc.join("channel", "private")` | Create a private channel |
| `cc.list()` | Show available channels |
| `cc.who()` | Show users on current channel |
| `cc.leave()` | Leave current channel |
| `cc.close()` | Close chat |

## Development

### Prerequisites
- Node.js 18+
- npm

### Setup

```bash
# Install server dependencies
npm install

# Run the server
npm start

# Or with auto-reload (Node.js 18+)
npm run dev
```

### Building the Client

```bash
cd scripts
npm install
npm run build
```

## Project Structure

```
console-chat/
├── server.js              # Main server (Socket.IO 4.x)
├── flood.js               # Flood protection middleware
├── package.json           # Server dependencies
├── demo/                  # Demo page
│   ├── index.html
│   └── console-chat.js
└── scripts/
    ├── src/
    │   └── console-chat.js    # Client source
    ├── dist/
    │   ├── console-chat.js    # Built client
    │   └── console-chat-min.js # Minified client
    └── gulpfile.js            # Build config
```

## Migration from 1.x

If you're upgrading from version 1.x:

1. **Socket.IO 4.x is required** - The bundled Socket.IO 2.x has been removed
2. **Add Socket.IO CDN** - You must now include Socket.IO separately
3. **API unchanged** - All `cc.*` commands work the same

## License

MIT © Kimmo Ihanus
