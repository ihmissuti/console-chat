const express = require('express');
const app = express();
const uuid = require('uuid');
const { URL } = require('url');

// Disable x-powered-by header for security
app.disable('x-powered-by');

// Middlewares
app.use(express.static('demo'));

// Routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/demo/index.html');
});

// Listen on port 5000
const server = app.listen(process.env.PORT || 5000, function() {
    console.log('ConsoleChat server listening on port', process.env.PORT || 5000);
});

// Socket.IO 4.x initialization with CORS support
const io = require('socket.io')(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    cookie: false
});

// State management (in-memory)
let users = [];
let connections = [];
let channels = [];
let userChannels = [];
let connectedUsers = [];

const flood = require('./flood');

// Listen on every connection
io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);
    connections.push(socket);
    socket.join('public');
    
    // Build welcome message
    let connectedUsersStr = '';
    if (connectedUsers.length === 1) {
        connectedUsersStr = 'is 1 user';
    } else {
        connectedUsersStr = 'are ' + connectedUsers.length + ' users';
    }
    
    socket.emit('welcome_message', {
        message: 'This site uses ConsoleChat.io - The Underground Meeting Room. There ' + connectedUsersStr + ' online.\n' +
            'Launch cc.io: cc.start()\n\n' +
            'All available commands:\n' +
            'cc.start() = Launch chat\n' +
            'cc.help() = Get instructions\n' +
            'cc.username("username") = Set a nickname\n' +
            'cc.public() = Chat with users on global channel\n' +
            'cc.onsite() = Chat only to users on the same site that you are currently (current tab)\n' +
            'cc.say("message") = Send a message to chat\n' +
            'cc.msg("username", "message") = Send a private message to user\n' +
            'cc.join("channel") = Join a channel. Or create a channel if the channel does not exist yet.\n' +
            'cc.join("channel", "private") = Creates a private channel that is not visible for others via cc.list()\n' +
            'cc.list() = Shows a list of all public channels available.\n' +
            'cc.who() = Shows a list of users who are currently on the channel.\n' +
            'cc.leave() = Leave your current channel\n' +
            'cc.close() = Close chat'
    });
    
    socket.username = 'Anonymous';
    socket.toWebsite = false;
    socket.room = 'public';

    // Handle start
    socket.on('start', () => {
        connectedUsers.push({ id: socket.id, username: socket.username });
        updateChannelData(socket, socket.room);
    });

    // Listen on change_username
    socket.on('change_username', async (data) => {
        updateChannelData(socket, socket.room);
        const existingUsername = await checkIfUsernameExists(data.nickName);
        if (!existingUsername) {
            socket.username = data.nickName;
            users.push({ id: socket.id, username: socket.username, color: socket.color });
            updateUsernames();
            io.to(socket.id).emit('message_to_user', {
                message: 'Your username is now ' + data.nickName,
                username: socket.username,
                hostname: 'undefined',
                error: false
            });
        } else {
            io.to(socket.id).emit('message_to_user', {
                message: 'That username already exists.',
                username: socket.username,
                hostname: 'undefined',
                error: true
            });
        }
    });

    // Update usernames in the client
    const updateUsernames = () => {
        io.sockets.emit('get users', users);
    };

    // Listen on new_message
    socket.on('new_message', (data) => {
        // Broadcast the new message
        if (flood.protect(io, socket)) {
            if (socket.toWebsite) {
                if (stringIsAValidUrl(socket.handshake.headers.origin)) {
                    const socketURL = new URL(socket.handshake.headers.origin).hostname;

                    if (socket.room === 'public') {
                        console.log('1. Sending message on channel ' + socket.room);
                        io.to(socket.room).emit('new_message', {
                            message: data.message,
                            username: '<' + socket.username + '>',
                            hostname: data.hostname,
                            error: false,
                            channel: socket.room
                        });
                    } else {
                        console.log('2. Sending message in channel ' + socket.room);
                        io.to(socket.room).emit('new_message', {
                            message: data.message,
                            username: '<' + socket.username + '>',
                            hostname: data.hostname,
                            error: false,
                            channel: socket.room
                        });
                    }
                } else {
                    console.log('Error occurred');
                    io.to(socket.id).emit('message_to_user', {
                        message: 'An error occurred.',
                        username: socket.username,
                        hostname: 'undefined',
                        error: true
                    });
                }
            } else {
                console.log('3. Sending message in channel ' + socket.room);
                io.to(socket.room).emit('new_message', {
                    message: data.message,
                    username: '<' + socket.username + '>',
                    hostname: data.hostname,
                    error: null,
                    channel: socket.room
                });
            }
        }
    });

    socket.on('onsite', () => {
        console.log('User changed to speak only on hostname ' + socket.handshake.headers.origin);
        // Speak only to the current website
        if (flood.protect(io, socket)) {
            if (stringIsAValidUrl(socket.handshake.headers.origin)) {
                socket.leave('public');
                const socketURL = new URL(socket.handshake.headers.origin).hostname;
                socket.join(socketURL);
                socket.room = socketURL;
                socket.toWebsite = true;
                updateChannelData(socket, socket.room);
                io.to(socket.id).emit('message_to_user', {
                    message: 'You are now talking to channel ' + socketURL,
                    username: socket.username,
                    hostname: socket.handshake.headers.origin
                });
            } else {
                io.to(socket.id).emit('message_to_user', {
                    message: 'An error occurred.',
                    username: socket.username,
                    hostname: 'undefined',
                    error: true
                });
            }
        }
    });

    // Send instructions to user
    socket.on('help', () => {
        if (flood.protect(io, socket)) {
            if (stringIsAValidUrl(socket.handshake.headers.origin)) {
                io.to(socket.id).emit('message_to_user', {
                    message: 'cc.start() = Launch cc.io\ncc.help() = Get instructions',
                    username: socket.username,
                    hostname: socket.handshake.headers.origin
                });
            } else {
                io.to(socket.id).emit('message_to_user', {
                    message: 'An error occurred.',
                    username: socket.username,
                    hostname: 'undefined',
                    error: true
                });
            }
        }
    });

    socket.on('public', () => {
        console.log('User changed to speak on public ' + socket.handshake.headers.origin);
        // Speak only to the current website
        if (flood.protect(io, socket)) {
            if (stringIsAValidUrl(socket.handshake.headers.origin)) {
                clearChannelArrays(socket);
                const socketURL = new URL(socket.handshake.headers.origin).hostname;
                socket.leave(socketURL);
                socket.leave(socket.room);
                socket.toWebsite = false;
                socket.join('public');
                socket.room = 'public';
                updateChannelData(socket, socket.room);
                io.to(socket.id).emit('message_to_user', {
                    message: 'Your messages will now be visible on the public channel.',
                    username: socket.username,
                    hostname: socket.handshake.headers.origin
                });
            } else {
                io.to(socket.id).emit('message_to_user', {
                    message: 'An error occurred.',
                    username: socket.username,
                    hostname: 'undefined',
                    error: true
                });
            }
        }
    });

    socket.on('new_private_message', (data) => {
        // Speak only to the current website
        if (flood.protect(io, socket)) {
            if (stringIsAValidUrl(socket.handshake.headers.origin)) {
                const socketToSend = users.filter(function(value) {
                    return value.username === data.nickname;
                });
                const socketURL = new URL(socket.handshake.headers.origin).hostname;
                
                // Fixed: Check socketToSend[0].username instead of socketToSend.username
                if (socketToSend[0] && socketToSend[0].username !== 'Anonymous' && socket.username !== 'Anonymous') {
                    console.log('Sending a private message to ' + socketToSend[0].id);
                    io.to(socketToSend[0].id).emit('new_message', {
                        message: data.message,
                        username: '<' + socket.username + '> PRIVATE',
                        hostname: socketURL,
                        channel: socket.room
                    });
                    io.to(socket.id).emit('message_to_user', {
                        message: 'Your message was sent.'
                    });
                } else {
                    io.to(socket.id).emit('message_to_user', {
                        message: 'An error occurred. Anonymous users are not able to send private messages.',
                        username: socket.username,
                        hostname: 'undefined',
                        error: true,
                        msg_type: 'PRIVATE_MSG',
                        channel: socket.room
                    });
                }
            } else {
                io.to(socket.id).emit('message_to_user', {
                    message: 'An error occurred.',
                    username: socket.username,
                    hostname: 'undefined',
                    error: true
                });
            }
        }
    });

    // Join or create a channel
    socket.on('join', async (data) => {
        if (flood.protect(io, socket)) {
            if (stringIsAValidUrl(socket.handshake.headers.origin)) {
                // User is already on this channel
                if (data.channel === socket.room) {
                    io.to(socket.id).emit('message_to_user', {
                        message: 'You are already on channel: ' + data.channel,
                        username: socket.username,
                        hostname: socket.handshake.headers.origin
                    });
                } else {
                    await clearChannelArrays(socket);
                    // User is not on this channel yet
                    socket.leave(socket.room);
                    const socketURL = new URL(socket.handshake.headers.origin).hostname;
                    socket.leave(socketURL);
                    socket.leave('public');
                    socket.room = data.channel;
                    socket.join(data.channel);

                    const existingChannel = await getExistingChannel(data.channel, data.type);
                    if (!existingChannel) {
                        const channelId = uuid.v4();
                        const newChannelData = {
                            created_by_socket_id: socket.id,
                            channel_id: channelId,
                            created_by_username: socket.username,
                            channel: data.channel,
                            type: data.type,
                            toWebsite: socket.toWebsite
                        };
                        channels.push(newChannelData);
                        console.log('A new channel will be created. Channel data:', newChannelData);
                        
                        const userChannelData = {
                            socket_id: socket.id,
                            channel_id: channelId,
                            username: socket.username,
                            channel: data.channel,
                            type: data.type,
                            toWebsite: socket.toWebsite
                        };
                        userChannels.push(userChannelData);
                        console.log('User channel data:', userChannelData);

                        io.to(socket.id).emit('message_to_user', {
                            message: 'You created a new channel: ' + data.channel,
                            username: socket.username,
                            hostname: socket.handshake.headers.origin
                        });
                    } else {
                        const channelId = await getChannelId(data.channel, data.type);
                        const usersOnChannel = await getChannelUsersCount(channelId);
                        const channelData = {
                            socket_id: socket.id,
                            channel_id: channelId,
                            username: socket.username,
                            channel: data.channel,
                            type: data.type,
                            toWebsite: socket.toWebsite
                        };
                        console.log('User will be added to existing channel. Channel data:', channelData);
                        userChannels.push(channelData);
                        
                        if (usersOnChannel === 1) {
                            io.to(socket.id).emit('message_to_user', {
                                message: 'You are now talking on channel: ' + data.channel + '. There is ' + usersOnChannel + ' user online besides you.',
                                username: socket.username,
                                hostname: socket.handshake.headers.origin
                            });
                        } else {
                            io.to(socket.id).emit('message_to_user', {
                                message: 'You are now talking on channel: ' + data.channel + '. There are ' + usersOnChannel + ' users online besides you.',
                                username: socket.username,
                                hostname: socket.handshake.headers.origin
                            });
                        }
                    }
                }
            } else {
                io.to(socket.id).emit('message_to_user', {
                    message: 'An error occurred.',
                    username: socket.username,
                    hostname: 'undefined',
                    error: true
                });
            }
        }
    });

    // Show all channels
    socket.on('list', async () => {
        if (flood.protect(io, socket)) {
            if (stringIsAValidUrl(socket.handshake.headers.origin)) {
                const currentChannels = await getCurrentChannels(socket);
                io.to(socket.id).emit('show_channel_list', {
                    message: currentChannels,
                    username: socket.username,
                    hostname: socket.handshake.headers.origin
                });
            } else {
                io.to(socket.id).emit('message_to_user', {
                    message: 'An error occurred.',
                    username: socket.username,
                    hostname: 'undefined',
                    error: true
                });
            }
        }
    });

    // List the users currently on the channel
    socket.on('who', async () => {
        if (flood.protect(io, socket)) {
            if (stringIsAValidUrl(socket.handshake.headers.origin)) {
                const channelId = await getChannelId(socket.room);
                const userList = await getUserList(channelId);
                console.log('Get user list on channel ' + channelId, userList);
                io.to(socket.id).emit('show_user_list', {
                    message: userList,
                    username: socket.username,
                    hostname: socket.handshake.headers.origin
                });
            } else {
                io.to(socket.id).emit('message_to_user', {
                    message: 'An error occurred.',
                    username: socket.username,
                    hostname: 'undefined',
                    error: true
                });
            }
        }
    });

    // Leave a channel
    socket.on('leave', () => {
        if (flood.protect(io, socket)) {
            if (stringIsAValidUrl(socket.handshake.headers.origin)) {
                if (socket.toWebsite) {
                    if (socket.room === new URL(socket.handshake.headers.origin).hostname) {
                        io.to(socket.id).emit('message_to_user', {
                            message: 'No channel to leave. Use cc.public() if you wish to speak on public channel.',
                            username: socket.username,
                            hostname: 'undefined',
                            error: true
                        });
                    } else {
                        const roomUserLeft = socket.room;
                        socket.leave(socket.room);
                        const socketURL = new URL(socket.handshake.headers.origin).hostname;
                        socket.join(socketURL);
                        socket.room = socketURL;
                        updateChannelData(socket, socket.room);
                        io.to(socket.id).emit('message_to_user', {
                            message: 'You left the channel ' + roomUserLeft + '. You are now speaking to ' + socket.room + ' channel.',
                            username: socket.username,
                            hostname: socket.handshake.headers.origin
                        });
                    }
                } else {
                    const roomUserLeft = socket.room;
                    socket.leave(socket.room);
                    socket.join('public');
                    socket.room = 'public';
                    updateChannelData(socket, socket.room);
                    io.to(socket.id).emit('message_to_user', {
                        message: 'You left the channel ' + roomUserLeft + '. You are now speaking to ' + socket.room + ' channel.',
                        username: socket.username,
                        hostname: socket.handshake.headers.origin
                    });
                }
            } else {
                io.to(socket.id).emit('message_to_user', {
                    message: 'An error occurred.',
                    username: socket.username,
                    hostname: 'undefined',
                    error: true
                });
            }
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        if (!socket.username) return;
        
        // Find the user and delete from the users list
        let user = undefined;
        for (let i = 0; i < users.length; i++) {
            if (users[i].id === socket.id) {
                user = users[i];
                break;
            }
        }

        clearChannelArrays(socket);
        users = users.filter(x => x !== user);
        // Update the users list
        updateUsernames();
        connections.splice(connections.indexOf(socket), 1);
        connectedUsers.splice(connectedUsers.indexOf(socket), 1);
        console.log('User disconnected:', socket.id);
    });
});

function checkIfUsernameExists(username) {
    for (let i = 0; i < users.length; i++) {
        if (users[i].username === username) {
            return true;
        }
    }
    return false;
}

async function clearChannelArrays(socket) {
    for (let i = userChannels.length - 1; i >= 0; --i) {
        if (userChannels[i].socket_id === socket.id) {
            console.log('Remove user from the channel ' + userChannels[i].channel);
            
            const usersOnChannel = await getChannelUsersCount(userChannels[i].channel_id);
            if (usersOnChannel === 1) {
                for (let j = channels.length - 1; j >= 0; --j) {
                    if (channels[j].channel_id === userChannels[i].channel_id) {
                        console.log('Remove the channel ' + channels[j].channel);
                        channels.splice(j, 1);
                    }
                }
            }
            userChannels.splice(i, 1);
        }
    }
}

function getChannelUsersCount(id) {
    let count = 0;
    for (let i = 0; i < userChannels.length; i++) {
        if (userChannels[i].channel_id === id) {
            count++;
        }
    }
    return count;
}

function getUserList(id) {
    const usersList = [];
    for (let i = 0; i < userChannels.length; i++) {
        if (userChannels[i].channel_id === id) {
            usersList.push(userChannels[i].username);
        }
    }
    return usersList;
}

function getExistingChannel(channel) {
    for (let i = 0; i < channels.length; i++) {
        if (channels[i].channel === channel) {
            return true;
        }
    }
    return false;
}

// Get current channels and return an array list
function getCurrentChannels(socket) {
    const currentChannels = [];
    for (let i = 0; i < channels.length; i++) {
        if (channels[i].toWebsite === socket.toWebsite && channels[i].type !== 'private') {
            currentChannels.push(channels[i].channel);
        }
    }
    return currentChannels;
}

// Get channel id
function getChannelId(channel) {
    let id = '';
    for (let i = 0; i < channels.length; i++) {
        if (channels[i].channel === channel) {
            id = channels[i].channel_id;
        }
    }
    return id;
}

async function updateChannelData(socket, channel, type) {
    await clearChannelArrays(socket);
    const existingChannel = await getExistingChannel(channel);
    if (!existingChannel) {
        const channelId = uuid.v4();
        const newChannelData = {
            created_by_socket_id: socket.id,
            channel_id: channelId,
            created_by_username: socket.username,
            channel: channel,
            type: type,
            toWebsite: socket.toWebsite
        };
        channels.push(newChannelData);
        console.log('A new channel will be created. Channel data:', newChannelData);
        
        const userChannelData = {
            socket_id: socket.id,
            channel_id: channelId,
            username: socket.username,
            channel: channel,
            type: type,
            toWebsite: socket.toWebsite
        };
        userChannels.push(userChannelData);
        console.log('User channel data:', userChannelData);
    } else {
        const channelId = await getChannelId(channel);
        const channelData = {
            socket_id: socket.id,
            channel_id: channelId,
            username: socket.username,
            channel: channel,
            type: type,
            toWebsite: socket.toWebsite
        };
        console.log('User will be added to existing channel. Channel data:', channelData);
        userChannels.push(channelData);
    }
}

const stringIsAValidUrl = (s, protocols) => {
    try {
        new URL(s);
        return true;
    } catch (err) {
        return false;
    }
};
