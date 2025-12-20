// Flood protection: No more than 10 requests per second
const FLOOD_TIME = 1000;
const FLOOD_MAX = 10;

const flood = {
    floods: {},
    lastFloodClear: new Date(),
    
    /**
     * Protect against flood attacks
     * @param {Object} io - Socket.IO server instance (kept for API compatibility)
     * @param {Object} socket - The socket making the request
     * @returns {boolean} - true if request is allowed, false if blocked
     */
    protect: (io, socket) => {
        // Reset flood protection counters periodically
        if (Math.abs(new Date() - flood.lastFloodClear) > FLOOD_TIME) {
            flood.floods = {};
            flood.lastFloodClear = new Date();
        }

        // Initialize flood tracking for this socket
        if (!flood.floods[socket.id]) {
            flood.floods[socket.id] = { count: 0 };
        }
        flood.floods[socket.id].count++;

        // Disconnect socket if they exceeded FLOOD_MAX requests in FLOOD_TIME
        if (flood.floods[socket.id].count > FLOOD_MAX) {
            console.log('FLOOD PROTECTION: Disconnecting', socket.id);
            // Socket.IO 4.x: Use socket.disconnect() directly
            socket.disconnect(true);
            return false;
        }

        return true;
    }
};

module.exports = flood;