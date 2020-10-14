const express = require('express');
const app = express();
let randomColor = require('randomcolor');
const uuid = require('uuid');

//Disable x-powered-by header
app.disable('x-powered-by')

//Listen on port 5000
server = app.listen( process.env.PORT || 5000, function(){
    console.log("server listening");
 });

//socket.io instantiation
const io = require("socket.io")(server);

let users = [];
let connnections = [];

//listen on every connection
io.on('connection', (socket) => {
    console.log('New user connected');
    connnections.push(socket)
    if (connnections.length == 0) {
        socket.emit('welcome_message', {message: 'This site uses Console.Chat - The underground developer chat. There are ' + connnections.length + ' users online. Please invite all your sucker friends here. To start chatting use CC.say("Your-freak-stuff-here") function, and to update your username call CC.username("Your-even-freakier-username")'})
    } else {
        socket.emit('welcome_message', {message: 'Welcome to Console.Chat! There are ' + connnections.length + ' of you freaks online. To start chatting use CC.say("Your-freak-stuff-here") function, and to update your username call CC.username("Your-even-freakier-username")'})
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
        io.sockets.emit('new_message', {message : data.message, username : socket.username});
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