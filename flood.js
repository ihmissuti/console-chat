// Not more then 10 request in 1 seconds
let FLOOD_TIME = 1000;
let FLOOD_MAX = 10;

let flood = {
    floods: {},
    lastFloodClear: new Date(),
    protect: (io, socket) => {

        // Reset flood protection
        if( Math.abs( new Date() - flood.lastFloodClear) > FLOOD_TIME ){
            flood.floods = {};
            flood.lastFloodClear = new Date();
        }

        flood.floods[socket.id] == undefined ? flood.floods[socket.id] = {} : flood.floods[socket.id];
        flood.floods[socket.id].count == undefined ? flood.floods[socket.id].count = 0 : flood.floods[socket.id].count;
        flood.floods[socket.id].count++;

        //Disconnect the socket if he went over FLOOD_MAX in FLOOD_TIME
        if( flood.floods[socket.id].count > FLOOD_MAX){
            console.log('FLOODPROTECTION ', socket.id)
            io.sockets.connected[socket.id].disconnect();
            return false;
        }

        return true;
    }
}

exports = module.exports = flood;