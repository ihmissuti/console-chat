const express = require('express');
const app = express();
const uuid = require('uuid');
const { URL, parse } = require('url');

//Disable x-powered-by header
app.disable('x-powered-by')

//Listen on port 5000
server = app.listen( process.env.PORT || 5000, function(){
    console.log("server listening");
 });

//socket.io instantiation
const io = require("socket.io")(server, {cookie: false});

let users = [];
let connnections = [];

//listen on every connection
io.on('connection', (socket) => {

    console.log('New user connected');
    connnections.push(socket)
    
    //later on implement functionalities for speakin only to the spesific hostname
    // if (stringIsAValidUrl(socket.handshake.headers.origin)) {
    //     var socketURL = new URL(socket.handshake.headers.origin);
    //     socket.join(socketURL);
    // } else {
    //     socket.join(socketURL);
    // }
    
    if (connnections.length == 0) {
        socket.emit('welcome_message', {message: 'This site uses Console.Chat - The underground meetingroom for developers. To start chatting use these functions in console:\n\nconsolechat.start()\nconsolechat.username("Your anonymous username")\nconsolechat.say("I love async functions!")'})
    } else {
        socket.emit('welcome_message', {message: 'This site uses Console.Chat - The underground meetingroom for developers. There are ' + connnections.length + ' users online. To start chatting use these functions in console:\n\nconsolechat.start()\nconsolechat.username("Your anonymous username")\nconsolechat.say("I love async functions!")\nconsolechat.close()'})
    }
    
    socket.username = 'Anonymous';

    //listen on change_username
    socket.on('change_username', data => {
        let id = uuid.v4(); // create a random id for the user
        socket.id = id;
        socket.username = data.nickName;
        users.push({id, username: socket.username, color: socket.color});
        updateUsernames();
    })

    //update Usernames in the client
    const updateUsernames = () => {
        io.sockets.emit('get users',users)
    }

    //listen on new_message
    socket.on('new_message', (data) => {
        //broadcast the new message
        io.sockets.emit('new_message', {message : data.message, username : socket.username, hostname: data.hostname});

        //later on implement the functionalitites to send messages only to spesific hostname
        // io.in(socketURL).emit('new_message', {message : data.message, username : socket.username});
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
        connnections.splice(connnections.indexOf(socket),1);
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