import { Server } from 'socket.io';

let io = null;

// Socket.io server-ini başlat
export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });

    // Aktivlik log-larına qoşulma
    socket.on('join-activity-room', () => {
      socket.join('activity-room');
      console.log('Client joined activity-room:', socket.id);
    });

    // Aktivlik log-larından çıxma
    socket.on('leave-activity-room', () => {
      socket.leave('activity-room');
      console.log('Client left activity-room:', socket.id);
    });

    // Customer room-una qoşulma
    socket.on('join-customer-room', () => {
      socket.join('customer-room');
      console.log('Client joined customer-room:', socket.id);
    });

    // Customer room-undan çıxma
    socket.on('leave-customer-room', () => {
      socket.leave('customer-room');
      console.log('Client left customer-room:', socket.id);
    });
  });

  return io;
};

// Yeni aktivlik yaradılanda emit et
export const emitNewActivity = (activity) => {
  if (io) {
    io.to('activity-room').emit('new-activity', activity);
    console.log('📢 New activity emitted:', activity.id);
  }
};

// Aktivlik yenilənəndə emit et
export const emitActivityUpdate = (activity) => {
  if (io) {
    io.to('activity-room').emit('activity-update', activity);
  }
};

// Customer status dəyişikliyi zamanı emit et
export const emitCustomerStatusUpdate = (customer) => {
  if (io) {
    io.to('customer-room').emit('customer-status-update', customer);
    console.log('📢 Customer status update emitted:', customer.id, 'isActive:', customer.isActive);
  }
};

// Customer yenilənəndə emit et
export const emitCustomerUpdate = (customer) => {
  if (io) {
    io.to('customer-room').emit('customer-update', customer);
    console.log('📢 Customer update emitted:', customer.id);
  }
};

export default io;

