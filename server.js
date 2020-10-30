const express = require('express');
const app = express();
const uuid = require('uuid');
const { URL, parse } = require('url');

//Disable x-powered-by header
app.disable('x-powered-by')

//middlewares
app.use(express.static('demo'));

//routes
app.get('/', (req,res)=>{
    res.sendFile(__dirname + '/public/index.html');
});

//Listen on port 5000
server = app.listen( process.env.PORT || 5000, function(){
    console.log("server listening");
 });

//socket.io instantiation
const io = require("socket.io")(server, {cookie: false});

let users = [];
let connections = [];
let channels = [];
var userChannels = [];
let flood = require('./flood')
var connectedUsers = []

//listen on every connection
io.on('connection', (socket) => {

    console.log('New user connected');
    connections.push(socket)
    socket.join('public');
    var connectedUsersStr =''
    if (connectedUsers.length == 1) {
        connectedUsersStr = 'is 1 user'
    } else {
        connectedUsersStr = 'are ' + connectedUsers.length + ' users'
    }
    // socket.emit('welcome_message', {message:'boo'})
    socket.emit('welcome_message', {message:'This site uses ConsoleChat.io - The Underground Meeting Room. There ' + connectedUsersStr + '  online.\nLaunch cc.io: cc.start()\n\nAll availble commands:\ncc.start() = Launch chat\ncc.help() = Get instructions\ncc.username("username") = Set a nickname\ncc.public() = Chat with users on global channel\ncc.onsite() = Chat only to users on the same site that your are currently (current tab)\ncc.say("message") = Send a message to chat\ncc.msg("username", "message") = Send a private message to user\ncc.join("channel") = Join a channel. Or create a chanel if the channel does not exist yet.\ncc.join("channel", "private") = Creates a private channel that is not visible for others via cc.list()\ncc.list() = Shows a list of all public channels available.\ncc.who() = Shows a list of users who are currently on the channel.\ncc.leave() = Leave your current channel\ncc.close() = Close chat'})
        // 'This site uses Console.Chat - The underground meetingroom for developers. There are ' + connections.length + ' users online. To start chatting use these functions in console:\n\ncc.start()\ncc.username("Your anonymous username")\ncc.say("I love async functions!")\ncc.close()'})
    
    socket.username = 'Anonymous';
    socket.toWebsite = false
    socket.room = 'public'
 
   
   socket.on('start',  () => {
        connectedUsers.push({id: socket.id, username: socket.username});
        updateChannelData (socket, socket.room)
   })

    //listen on change_username
    socket.on('change_username', async (data) => {
        updateChannelData (socket, socket.room)
        // let id = uuid.v4(); // create a random id for the user
        // socket.id = id;
        var existingUsername = await checkIfUsernameExists(data.nickName)
        if (!existingUsername) {
            socket.username = data.nickName;
            users.push({id: socket.id, username: socket.username, color: socket.color});
            updateUsernames();
            io.to(socket.id).emit('message_to_user', {message : 'Your username is now ' + data.nickName, username : socket.username, hostname: 'undefined', error: true});
        } else {
            io.to(socket.id).emit('message_to_user', {message : 'That username already exists.', username : socket.username, hostname: 'undefined', error: true});
        }
    })

    //update Usernames in the client
    const updateUsernames = () => {
        io.sockets.emit('get users',users)
    }

    //listen on new_message
    socket.on('new_message', (data) => {

        //broadcast the new message
        if(flood.protect(io, socket)){

            if (socket.toWebsite) {

                if (stringIsAValidUrl(socket.handshake.headers.origin)) {
                    var socketURL = new URL(socket.handshake.headers.origin).hostname;

                        if (socket.room == 'public') {
                            console.log('1. Sending message on channel ' + socket.room)
                            io.to(socket.room).emit('new_message', {message : data.message, username : '<' + socket.username + '>', hostname: data.hostname, error:false, channel: socket.room});
                        } else {
                            console.log('2. Sending message in channel ' + socket.room)
                            io.to(socket.room).emit('new_message', {message : data.message, username : '<' + socket.username + '>', hostname: data.hostname, error:false, channel: socket.room});
                        }                     
                  
                } else {
                    console.log("error occured")
                    io.to(socket.id).emit('message_to_user', {message : 'An error occured.', username : socket.username, hostname: 'undefined', error: true});
                }
                
            } else {

                console.log('3. Sending message in channel ' + socket.room)
                io.to(socket.room).emit('new_message', {message : data.message, username : '<' + socket.username + '>', hostname: data.hostname, error: null, channel: socket.room});
              
            }
        }  
       
    })

    socket.on('onsite', () => {

        console.log("User changed to speak only on hostname " + socket.handshake.headers.origin)
        //Speak only to the current website
        if(flood.protect(io, socket)){
            if (stringIsAValidUrl(socket.handshake.headers.origin)) {
                socket.leave('public');
                var socketURL = new URL(socket.handshake.headers.origin).hostname;
                socket.join(socketURL);
                socket.room = socketURL
                socket.toWebsite = true
                updateChannelData (socket, socket.room)
                io.to(socket.id).emit('message_to_user', {message : 'You are now talking to channel ' + socketURL, username : socket.username, hostname: socket.handshake.headers.origin});
            } else {
                io.to(socket.id).emit('message_to_user', {message : 'An error occured.', username : socket.username, hostname: 'undefined', error:true});
            }
        }  
    })

    //send instructions to user
    socket.on('help', () => {

        if(flood.protect(io, socket)){
            if (stringIsAValidUrl(socket.handshake.headers.origin)) {
                io.to(socket.id).emit('message_to_user', {message : 
                    'cc.start() = Launch cc.io\n' +
                    'cc.help() = Get instructions\n'
                    , username : socket.username, hostname: socket.handshake.headers.origin});
            } else {
                io.to(socket.id).emit('message_to_user', {message : 'An error occured.', username : socket.username, hostname: 'undefined', error:true});
            }
        }  
    })

    socket.on('public', () => {

        console.log("User changed to speak on public " + socket.handshake.headers.origin)
        //Speak only to the current website
        if(flood.protect(io, socket)){
            if (stringIsAValidUrl(socket.handshake.headers.origin)) {
                clearChannelArrays(socket)
                var socketURL = new URL(socket.handshake.headers.origin).hostname;
                socket.leave(socketURL);
                socket.leave(socket.room)
                socket.toWebsite = false
                socket.join('public')
                socket.room = 'public'
                updateChannelData (socket, socket.room)
                io.to(socket.id).emit('message_to_user', {message : 'Your messages will now be visible on the public channel.', username : socket.username, hostname: socket.handshake.headers.origin});
            } else {
                io.to(socket.id).emit('message_to_user', {message : 'An error occured.', username : socket.username, hostname: 'undefined', error:true});
            }
        }  

    })

    socket.on('new_private_message', (data) => {

        // console.log("Sending a message to " + data.nickname)
        //Speak only to the current website
        if(flood.protect(io, socket)){
            if (stringIsAValidUrl(socket.handshake.headers.origin)) {
                var socketToSend = users.filter(function(value){ return value.username==data.nickname;})
                var socketURL = new URL(socket.handshake.headers.origin).hostname;
                console.log(socketToSend[0])
                if (socketToSend[0] && socketToSend.username != 'Anonymous' && socket.username != 'Anonymous' ) {
                    console.log("Sending a private message to " + socketToSend[0].id)
                    io.to(socketToSend[0].id).emit('new_message', {message : data.message, username : '<' + socket.username + '> PRIVATE', hostname: socketURL, channel: socket.room});
                    io.to(socket.id).emit('message_to_user', {message : 'Your messages was sent.'});
                } else {
                    io.to(socket.id).emit('message_to_user', {message : 'An error occured. Anonymous users are not able to send private messages.', username : socket.username, hostname: 'undefined',error:true, msg_type: 'PRIVATE_MSG', channel: socket.room});
                }
             
            } else {
                io.to(socket.id).emit('message_to_user', {message : 'An error occured!.', username : socket.username, hostname: 'undefined', error:true});
            }
        }  

    })

    //Join or create a channels
    socket.on('join', async (data) => {

        if(flood.protect(io, socket)){
            
            if (stringIsAValidUrl(socket.handshake.headers.origin)) {

                //user is already on this channel
                if (data.channel == socket.room) {
                    io.to(socket.id).emit('message_to_user', {message : 'You are already on channel: ' + data.channel, username : socket.username, hostname: socket.handshake.headers.origin});   
                } else {
                    clearChannelArrays(socket)
                    //user is not on this channel yet
                    socket.leave(socket.room);
                    var socketURL = new URL(socket.handshake.headers.origin).hostname;
                    socket.leave(socketURL);
                    socket.leave('public');
                    socket.room = data.channel
                    socket.join(data.channel);
    
                    var existingChannel = await getExistingChannel(data.channel, data.type)
                    if (!existingChannel) {
                        var channelId = uuid.v4()
                        var newChannelData= {
                            created_by_socket_id: socket.id, 
                            channel_id: channelId, 
                            created_by_username: socket.username, 
                            channel: data.channel,
                            type: data.type, 
                            toWebsite: socket.toWebsite
                        }
                        channels.push(newChannelData)
                        console.log("A new channel will be created. Channel data:")
                        console.log(newChannelData)
                        var userChannelData = {
                            socket_id: socket.id, 
                            channel_id: channelId,
                            username: socket.username,
                            channel: data.channel,
                            type: data.type, 
                            toWebsite: socket.toWebsite
                        }
                        userChannels.push(userChannelData)
                        console.log("User channel data:")
                        console.log(userChannelData)

                     
                        io.to(socket.id).emit('message_to_user', {message : 'You created a new channel : ' + data.channel, username : socket.username, hostname: socket.handshake.headers.origin});  
                    } else {
                       
                        var channelId = await getChannelId(data.channel, data.type)
                        var usersOnChannel = await getChannelUsersCount(channelId)
                        var channelData = {
                            socket_id: socket.id, 
                            channel_id: channelId, 
                            username: socket.username, 
                            channel: data.channel, 
                            type: data.type, 
                            toWebsite: socket.toWebsite
                        }
                        console.log("User will be added to existing channel. Channel data:")
                        console.log(channelData)
                        userChannels.push(channelData)
                        if (usersOnChannel == 1) {
                            io.to(socket.id).emit('message_to_user', {message : 'You are now talking on channel: ' + data.channel + '. There is ' + usersOnChannel + ' user online besides you.', username : socket.username, hostname: socket.handshake.headers.origin});         
                        } else {
                            io.to(socket.id).emit('message_to_user', {message : 'You are now talking on channel: ' + data.channel + '. There are ' + usersOnChannel + ' users online besides you.', username : socket.username, hostname: socket.handshake.headers.origin});         
                        }
                       
                    }

                }
                           
            } else {
                io.to(socket.id).emit('message_to_user', {message : 'An error occured!.', username : socket.username, hostname: 'undefined', error:true});
            }
        }  
    })

    //Show all channels
    socket.on('list', async () => {

        if(flood.protect(io, socket)){
            
            if (stringIsAValidUrl(socket.handshake.headers.origin)) {

                var currentChannels = await getCurrentChannels(socket)
                io.to(socket.id).emit('show_channel_list', {message : currentChannels, username : socket.username, hostname: socket.handshake.headers.origin});
                           
            } else {
                io.to(socket.id).emit('message_to_user', {message : 'An error occured!.', username : socket.username, hostname: 'undefined', error:true});
            }
        }  
    })

    //list the users currently on the channel
    socket.on('who', async () => {

            if(flood.protect(io, socket)){
                
                if (stringIsAValidUrl(socket.handshake.headers.origin)) {
                    
                    var channelId = await getChannelId(socket.room)
                    var userList = await getUserList(channelId)
                    console.log("Get user list on channel " + channelId)
                    console.log(userList)
                    io.to(socket.id).emit('show_user_list', {message : userList, username : socket.username, hostname: socket.handshake.headers.origin});
                               
                } else {
                    io.to(socket.id).emit('message_to_user', {message : 'An error occured!.', username : socket.username, hostname: 'undefined', error:true});
                }
            }  
    })

    //Leave a channel
    socket.on('leave', () => {

            if(flood.protect(io, socket)){
                
                if (stringIsAValidUrl(socket.handshake.headers.origin)) {
      
                    if (socket.toWebsite) {

                        if (socket.room == new URL(socket.handshake.headers.origin).hostname) {
                            io.to(socket.id).emit('message_to_user', {message : 'No channel to leave. Use cc.public() if you wish to speak on public channel.', username : socket.username, hostname: 'undefined', error:true});
                        } else {
                            // clearChannelArrays(socket)
                           
                            var roomUserLeft = socket.room
                            socket.leave(socket.room)
                            var socketURL = new URL(socket.handshake.headers.origin).hostname;
                            socket.join(socketURL);
                            socket.room = socketURL
                            updateChannelData (socket, socket.room)
                            io.to(socket.id).emit('message_to_user', {message : 'You left the channel ' + roomUserLeft + '. You are now speaking to ' + socket.room + ' channel.', username : socket.username, hostname: socket.handshake.headers.origin});
                        }

                    } else {
                        // clearChannelArrays(socket)
                        
                        var roomUserLeft = socket.room
                        socket.leave(socket.room)
                        socket.join('public');
                        socket.room = 'public'
                        updateChannelData (socket, socket.room)
                        io.to(socket.id).emit('message_to_user', {message : 'You left the channel ' + roomUserLeft + '. You are now speaking to ' + socket.room + ' channel.', username : socket.username, hostname: socket.handshake.headers.origin});
                    }
                   
                    
                } else {
                    io.to(socket.id).emit('message_to_user', {message : 'An error occured!.', username : socket.username, hostname: 'undefined', error:true});
                }
            }  
    })

    //Disconnect
    socket.on('disconnect', data => {

        if(!socket.username)
            return;
        //find the user and delete from the users list
        let user = undefined;
        for(let i= 0;i<users.length;i++){
            if(users[i].id === socket.id){
                user = users[i];
                break;
            }
        }

        clearChannelArrays(socket)
        users = users.filter( x => x !== user);
        //Update the users list
        updateUsernames();
        connections.splice(connections.indexOf(socket),1);
        connectedUsers.splice(connectedUsers.indexOf(socket),1);
    })
})

function checkIfUsernameExists(username) {
    for(let i= 0;i<users.length;i++){
        if(users[i].username == username){
            return true
        }
    }
    return false
}

async function clearChannelArrays(socket) {

    for (var i = userChannels.length - 1; i >= 0; --i) {

        if (userChannels[i].socket_id == socket.id) {
            console.log("Remove user from the channel " + userChannels[i].channel)
            
            var usersOnChannel = await getChannelUsersCount(userChannels[i].channel_id)
            if (usersOnChannel == 1) {

                for (var j = channels.length - 1; j >= 0; --j) {
                    if (channels[j].channel_id == userChannels[i].channel_id) {
                        console.log("Remove the channel " + channels[j].channel)
                        channels.splice(j,1);
                    }
                }
            }
            userChannels.splice(i,1);      
        }
    }

    // for (var i = userChannels.length - 1; i >= 0; --i) {

    //     if (userChannels[i].socket_id == socket.id) {
    //         console.log("Remove user from the channel")
            
    //         var usersOnChannel = await getChannelUsersCount(userChannels[i].channel, userChannels[i].type)
    //         if (usersOnChannel == 1) {
    //             console.log(socket.id)
    //             for (var j = channels.length - 1; j >= 0; --j) {
    //                 if (channels[j].channel_id == socket.id) {
    //                     console.log("Remove the channel")
    //                     channels.splice(j,1);
    //                 }
    //             }
    //         }
    //         userChannels.splice(i,1);
           
    //     }
    // }
   
}

function getChannelUsersCount(id) {
    var count = 0
    for(let i= 0;i<userChannels.length;i++){
        if(userChannels[i].channel_id == id){
            count++
        }
    }
    return count
}

function getUserList(id) {
    var users = []
    for(let i= 0;i<userChannels.length;i++){
        if(userChannels[i].channel_id == id){
            users.push(userChannels[i].username)
        }
    }
    return users
}

function getExistingChannel(channel) {
    for(let i= 0;i<channels.length;i++){
        if(channels[i].channel === channel){
            return true
        }
    }
    return false
}

//Get current channels and return an array list
function getCurrentChannels(socket) {
    var currentChannels = []
    for(let i= 0;i<channels.length;i++){
        if(channels[i].toWebsite == socket.toWebsite && channels[i].type !== 'private' ){
            currentChannels.push(channels[i].channel)
        }
    }
    return currentChannels
}

//Get channel id
function getChannelId(channel) {
    var id = ''
    for(let i= 0;i<channels.length;i++){
        if(channels[i].channel == channel){
            id=channels[i].channel_id
        }
    }
    return id
}

async function updateChannelData (socket, channel, type) {
    clearChannelArrays(socket)
    var existingChannel = await getExistingChannel(channel)
    if (!existingChannel) {
        var channelId = uuid.v4()
        var newChannelData= {
            created_by_socket_id: socket.id, 
            channel_id: channelId, 
            created_by_username: socket.username, 
            channel: channel,
            type: type, 
            toWebsite: socket.toWebsite
        }
        channels.push(newChannelData)
        console.log("A new channel will be created. Channel data:")
        console.log(newChannelData)
        var userChannelData = {
            socket_id: socket.id, 
            channel_id: channelId,
            username: socket.username,
            channel: channel,
            type: type, 
            toWebsite: socket.toWebsite
        }
        userChannels.push(userChannelData)
        console.log("User channel data:")
        console.log(userChannelData)
 
    } else {
       
        var channelId = await getChannelId(channel)
        var channelData = {
            socket_id: socket.id, 
            channel_id: channelId, 
            username: socket.username, 
            channel: channel, 
            type: type, 
            toWebsite: socket.toWebsite
        }
        console.log("User will be added to existing channel. Channel data:")
        console.log(channelData)
        userChannels.push(channelData)
       
    }
}


const stringIsAValidUrl = (s, protocols) => {
    try {
        new URL(s);
        const parsed = parse(s);
        return protocols
            ? parsed.protocol
                ? protocols.map(x => `${x.toLowerCase()}:`).includes(parsed.protocol)
                : false
            : true;
    } catch (err) {
        return false;
    }
};