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
let flood = require('./flood')

//listen on every connection
io.on('connection', (socket) => {

    console.log('New user connected');
    connections.push(socket)
    socket.join('public');
    var connectedUsers =''
    if (connections.length == 1) {
       connectedUsers = 'is ' + 1
    } else {
        connectedUsers = 'are ' + connections.length
    }
    socket.emit('welcome_message', {message:'This site uses ConsoleChat.io - The Underground Meeting Room. There ' + connectedUsers + ' users online.\nLaunch ConsoleChat.io: consolechat.start()\nSee all commands: consolechat.help()'})
        // 'This site uses Console.Chat - The underground meetingroom for developers. There are ' + connections.length + ' users online. To start chatting use these functions in console:\n\nconsolechat.start()\nconsolechat.username("Your anonymous username")\nconsolechat.say("I love async functions!")\nconsolechat.close()'})
    
    socket.username = 'Anonymous';
    socket.toWebsite = false
    socket.room = 'public'

    //listen on change_username
    socket.on('change_username', data => {
        // let id = uuid.v4(); // create a random id for the user
        // socket.id = id;
        socket.username = data.nickName;
        users.push({id: socket.id, username: socket.username, color: socket.color});
        updateUsernames();
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
                            console.log('1. Sending message in channel ' + socket.room)
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
                    'consolechat.start() = Launch ConsoleChat.io\n' +
                    'consolechat.help() = Get instructions\n'
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
                var socketURL = new URL(socket.handshake.headers.origin).hostname;
                socket.leave(socketURL);
                socket.leave(socket.room)
                socket.toWebsite = false
                socket.join('public')
                socket.room = 'public'
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
    socket.on('join', (data) => {

        if(flood.protect(io, socket)){
            
            if (stringIsAValidUrl(socket.handshake.headers.origin)) {
                socket.leave(socket.room);
                var socketURL = new URL(socket.handshake.headers.origin).hostname;
                socket.leave(socketURL);
                socket.leave('public');
                socket.room = data.channel
                socket.join(data.channel);
                io.to(socket.id).emit('message_to_user', {message : 'You are now talking in channel: ' + data.channel, username : socket.username, hostname: socket.handshake.headers.origin});    
                
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
                            io.to(socket.id).emit('message_to_user', {message : 'No channel to leave. Use consolechat.public() if you wish to speak on public channel.', username : socket.username, hostname: 'undefined', error:true});
                        } else {
                            var roomUserLeft = socket.room
                            socket.leave(socket.room)
                            var socketURL = new URL(socket.handshake.headers.origin).hostname;
                            socket.join(socketURL);
                            socket.room = socketURL
                            io.to(socket.id).emit('message_to_user', {message : 'You left the channel ' + roomUserLeft + '. You are now speaking to ' + socket.room + ' channel.', username : socket.username, hostname: socket.handshake.headers.origin});
                        }

                    } else {
                        var roomUserLeft = socket.room
                        socket.leave(socket.room)
                        socket.join('public');
                        socket.room = 'public'
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
        users = users.filter( x => x !== user);
        //Update the users list
        updateUsernames();
        connections.splice(connections.indexOf(socket),1);
    })
})

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