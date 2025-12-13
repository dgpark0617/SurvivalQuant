/**
 * Socket.io 클라이언트 설정
 * 클라이언트 측 Socket.io 연결을 관리합니다.
 */

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Socket.io 연결 초기화
 */
export function initSocket(): Socket {
  if (socket && socket.connected) {
    return socket;
  }
  
  // Socket.io 서버 URL 설정
  // 환경 변수 NEXT_PUBLIC_SOCKET_URL이 있으면 사용, 없으면 현재 호스트 사용
  const serverUrl = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin)
    : 'http://localhost:3000';
  
  socket = io(serverUrl, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });

  // 연결 상태 로깅
  const currentSocket = socket; // 로컬 변수에 저장하여 타입 안전성 확보
  currentSocket.on('connect', () => {
    console.log('Socket.io 연결 성공:', currentSocket.id);
  });

  currentSocket.on('connect_error', (error) => {
    console.error('Socket.io 연결 오류:', error);
  });

  currentSocket.on('disconnect', () => {
    console.log('Socket.io 연결 해제');
  });
  
  return socket;
}

/**
 * Socket.io 연결 가져오기
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Socket.io 연결 해제
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

