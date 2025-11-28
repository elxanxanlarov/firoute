import { io } from 'socket.io-client';

// Socket.io client instance
let socket = null;

// Socket bağlantısını başlat
export const initializeSocket = () => {
  if (!socket) {
    socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: true
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  } else if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

// Socket bağlantısını bağla
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Aktivlik room-una qoşul
export const joinActivityRoom = () => {
  if (socket && socket.connected) {
    socket.emit('join-activity-room');
  }
};

// Aktivlik room-undan çıx
export const leaveActivityRoom = () => {
  if (socket && socket.connected) {
    socket.emit('leave-activity-room');
  }
};

// Yeni aktivlik event-ini dinlə
export const onNewActivity = (callback) => {
  if (socket) {
    socket.on('new-activity', callback);
  }
};

// Aktivlik event listener-ını sil
export const offNewActivity = (callback) => {
  if (socket) {
    socket.off('new-activity', callback);
  }
};

// Aktivlik yenilənmə event-ini dinlə
export const onActivityUpdate = (callback) => {
  if (socket) {
    socket.on('activity-update', callback);
  }
};

// Aktivlik yenilənmə event listener-ını sil
export const offActivityUpdate = (callback) => {
  if (socket) {
    socket.off('activity-update', callback);
  }
};

// Customer room-una qoşul
export const joinCustomerRoom = () => {
  if (socket && socket.connected) {
    socket.emit('join-customer-room');
  }
};

// Customer room-undan çıx
export const leaveCustomerRoom = () => {
  if (socket && socket.connected) {
    socket.emit('leave-customer-room');
  }
};

// Customer status dəyişikliyi event-ini dinlə
export const onCustomerStatusUpdate = (callback) => {
  if (socket) {
    socket.on('customer-status-update', callback);
  }
};

// Customer status event listener-ını sil
export const offCustomerStatusUpdate = (callback) => {
  if (socket) {
    socket.off('customer-status-update', callback);
  }
};

// Customer yenilənmə event-ini dinlə
export const onCustomerUpdate = (callback) => {
  if (socket) {
    socket.on('customer-update', callback);
  }
};

// Customer yenilənmə event listener-ını sil
export const offCustomerUpdate = (callback) => {
  if (socket) {
    socket.off('customer-update', callback);
  }
};

export default socket;

