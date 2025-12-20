/**
 * ConsoleChat.io - Underground Developer Meeting Room
 * Version 2.0.0 (Demo)
 * 
 * This script requires Socket.IO 4.x client to be loaded first:
 * <script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
 */

const cc = (function(io, window) {
    'use strict';
    
    // Configuration - Use localhost for demo
    const SERVER_URL = 'http://localhost:5000';
    
    let socket = null;
    let started = false;

    // Initialize socket connection (lazy - connects on first start())
    const initSocket = () => {
        if (!socket) {
            if (typeof io === 'undefined') {
                console.error('ConsoleChat: Socket.IO not loaded. Please include the Socket.IO client script.');
                return false;
            }
            socket = io(SERVER_URL, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000
            });
            setupSocketListeners();
        }
        return true;
    };

    const setupSocketListeners = () => {
        socket.on('welcome_message', (data) => {
            console.log(`${data.message}`);
        });

        socket.on('new_message', (data) => {
            if (started) {
                if (!data.error) {
                    console.log(`@${data.hostname} #${data.channel} ${data.username}: ${data.message}`);
                } else {
                    console.log(`${data.message}`);
                }
            }
        });

        socket.on('message_to_user', (data) => {
            if (started) {
                console.log(`${data.message}`);
            }
        });

        socket.on('new_user_connected', (data) => {
            if (started) {
                console.log(`${data.message}`);
            }
        });

        socket.on('show_channel_list', (data) => {
            if (started) {
                if (data.message.length > 0) {
                    console.log('Available channels:');
                    for (let i = 0; i < data.message.length; i++) {
                        console.log(`  - ${data.message[i]}`);
                    }
                } else {
                    console.log('No channels available.');
                }
            }
        });

        socket.on('show_user_list', (data) => {
            if (started) {
                if (data.message.length > 0) {
                    console.log('Users on this channel:');
                    for (let i = 0; i < data.message.length; i++) {
                        console.log(`  - ${data.message[i]}`);
                    }
                } else {
                    console.log('No other users on this channel.');
                }
            }
        });

        socket.on('connect', () => {
            if (started) {
                console.log('ConsoleChat: Connected to server');
            }
        });

        socket.on('disconnect', (reason) => {
            if (started) {
                console.log('ConsoleChat: Disconnected -', reason);
            }
        });

        socket.on('connect_error', (error) => {
            if (started) {
                console.log('ConsoleChat: Connection error -', error.message);
            }
        });
    };

    const start = () => {
        if (!initSocket()) return;
        started = true;
        console.log('ConsoleChat started! Type cc.help() for available commands.');
        socket.emit('start');
    };

    const close = () => {
        started = false;
        console.log('ConsoleChat closed');
        if (socket) {
            socket.disconnect();
        }
    };

    const onsite = () => {
        if (!started) {
            console.log('Please start ConsoleChat with cc.start() first');
            return;
        }
        socket.emit('onsite');
    };

    const publicChannel = () => {
        if (!started) {
            console.log('Please start ConsoleChat with cc.start() first');
            return;
        }
        socket.emit('public');
    };

    const help = () => {
        console.log(
            'ConsoleChat Commands:\n' +
            '──────────────────────────────────────────\n' +
            'cc.start()                    - Launch chat\n' +
            'cc.help()                     - Show this help\n' +
            'cc.username("name")           - Set your nickname\n' +
            'cc.public()                   - Join the global public channel\n' +
            'cc.onsite()                   - Chat only with users on this website\n' +
            'cc.say("message")             - Send a message\n' +
            'cc.msg("user", "message")     - Send a private message\n' +
            'cc.join("channel")            - Join or create a channel\n' +
            'cc.join("channel", "private") - Create a private channel\n' +
            'cc.list()                     - Show available channels\n' +
            'cc.who()                      - Show users on current channel\n' +
            'cc.leave()                    - Leave current channel\n' +
            'cc.close()                    - Close chat'
        );
    };

    const username = (newUsername) => {
        if (!started) {
            console.log('Please start ConsoleChat with cc.start() first');
            return;
        }
        if (!newUsername || typeof newUsername !== 'string') {
            console.log('Usage: cc.username("your_name")');
            return;
        }
        socket.emit('change_username', { nickName: newUsername });
    };

    const say = (msg) => {
        if (!started) {
            console.log('Please start ConsoleChat with cc.start() first');
            return;
        }
        if (!msg || typeof msg !== 'string') {
            console.log('Usage: cc.say("your message")');
            return;
        }
        socket.emit('new_message', { message: msg, hostname: window.location.hostname });
    };

    const msg = (nickname, message) => {
        if (!started) {
            console.log('Please start ConsoleChat with cc.start() first');
            return;
        }
        if (!nickname || !message) {
            console.log('Usage: cc.msg("username", "your message")');
            return;
        }
        socket.emit('new_private_message', {
            message: message,
            hostname: window.location.hostname,
            nickname: nickname
        });
    };

    const join = (channel, type) => {
        if (!started) {
            console.log('Please start ConsoleChat with cc.start() first');
            return;
        }
        if (!channel || typeof channel !== 'string') {
            console.log('Usage: cc.join("channel_name") or cc.join("channel_name", "private")');
            return;
        }
        socket.emit('join', { channel: channel, type: type });
    };

    const list = () => {
        if (!started) {
            console.log('Please start ConsoleChat with cc.start() first');
            return;
        }
        socket.emit('list');
    };

    const who = () => {
        if (!started) {
            console.log('Please start ConsoleChat with cc.start() first');
            return;
        }
        socket.emit('who');
    };

    const leave = () => {
        if (!started) {
            console.log('Please start ConsoleChat with cc.start() first');
            return;
        }
        socket.emit('leave');
    };

    // Public API
    return {
        start: start,
        close: close,
        help: help,
        username: username,
        say: say,
        msg: msg,
        join: join,
        leave: leave,
        list: list,
        who: who,
        public: publicChannel,
        onsite: onsite
    };
})(typeof io !== 'undefined' ? io : null, window);
