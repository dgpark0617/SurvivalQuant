'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { initSocket } from '@/lib/socket';
import { Socket } from 'socket.io-client';

export default function Home() {
  const [name, setName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const router = useRouter();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isConnecting) return;

    setIsConnecting(true);

    try {
      // Socket 연결 초기화
      const socket = initSocket();

      // 연결 대기
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('연결 시간 초과'));
        }, 5000);

        socket.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });

        socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // 접속 성공 대기 (이벤트 리스너를 먼저 등록)
      const joinPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('접속 시간 초과 - 이벤트를 받지 못했습니다');
          reject(new Error('접속 시간 초과'));
        }, 5000);

        const joinedHandler = (data: any) => {
          console.log('player:joined 이벤트 수신:', data);
          // 플레이어 정보를 sessionStorage에 저장
          if (data.player) {
            sessionStorage.setItem('player', JSON.stringify(data.player));
          }
          clearTimeout(timeout);
          socket.off('player:joined', joinedHandler);
          socket.off('game:error', errorHandler);
          resolve();
        };

        const errorHandler = (data: { message: string }) => {
          console.error('game:error 이벤트 수신:', data);
          clearTimeout(timeout);
          socket.off('player:joined', joinedHandler);
          socket.off('game:error', errorHandler);
          reject(new Error(data.message));
        };

        socket.on('player:joined', joinedHandler);
        socket.on('game:error', errorHandler);
        console.log('이벤트 리스너 등록 완료, player:join 전송 대기...');
      });

      // 플레이어 접속
      console.log('player:join 이벤트 전송:', { name: name.trim() });
      socket.emit('player:join', { name: name.trim() });

      // 접속 성공 대기
      await joinPromise;

      console.log('접속 성공, 게임 페이지로 이동...');
      // 게임 페이지로 이동
      router.push('/game');
    } catch (error) {
      console.error('접속 오류:', error);
      alert(`접속 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      setIsConnecting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
          <h1 className="text-4xl font-bold mb-2 text-center text-blue-400">
            ⚔️ 텍스트 머드 게임
          </h1>
          <p className="text-gray-300 mb-8 text-center">
            실시간 채팅 기반 롤플레이 게임
          </p>
          
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                플레이어 이름
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="이름을 입력하세요"
                required
                disabled={isConnecting}
                maxLength={20}
              />
            </div>
            
            <button
              type="submit"
              disabled={!name.trim() || isConnecting}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded font-bold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isConnecting ? '접속 중...' : '게임 시작'}
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>명령어를 입력하여 게임을 플레이하세요!</p>
            <p className="mt-2">예: 이동 북, 공격, 인벤토리, 상태, 주변</p>
          </div>
        </div>
      </div>
    </main>
  );
}
