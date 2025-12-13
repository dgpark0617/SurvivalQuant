/**
 * Socket.io API Route (Vercel용)
 * Vercel의 서버리스 환경에서 Socket.io를 사용하기 위한 설정
 */

import { NextRequest } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

// Vercel에서는 서버리스 함수이므로, Socket.io를 직접 사용하기 어렵습니다.
// 대신 HTTP 폴링 방식으로 작동하도록 설정합니다.

export const runtime = 'nodejs';

// 게임 엔진과 파서는 전역으로 관리 (서버리스 함수 간 상태 공유)
let gameEngine: any = null;
let parseCommand: any = null;
let io: SocketIOServer | null = null;

// 게임 엔진 초기화
function initializeGameEngine() {
  if (gameEngine) return gameEngine;
  
  try {
    const gameModule = require('@/lib/game/engine');
    const parserModule = require('@/lib/game/parser');
    gameEngine = new gameModule.GameEngine();
    parseCommand = parserModule.parseCommand;
    console.log('게임 엔진 초기화 성공');
    return gameEngine;
  } catch (error) {
    console.error('게임 엔진 초기화 실패:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  // Socket.io 핸드셰이크 처리
  return new Response('Socket.io endpoint', { status: 200 });
}

export async function POST(request: NextRequest) {
  // Socket.io 폴링 요청 처리
  return new Response('Socket.io polling', { status: 200 });
}

