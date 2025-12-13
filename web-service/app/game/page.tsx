'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { Socket } from 'socket.io-client';
import { Player } from '@/lib/game/types';
import GameChat from '@/components/GameChat';

export default function GamePage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const router = useRouter();

  useEffect(() => {
    const socketInstance = getSocket();
    
    if (!socketInstance || !socketInstance.connected) {
      // Socket이 연결되지 않은 경우 메인 페이지로 리다이렉트
      router.push('/');
      return;
    }

    setSocket(socketInstance);

    // sessionStorage에서 플레이어 정보 가져오기 (이미 받은 경우)
    const savedPlayer = sessionStorage.getItem('player');
    if (savedPlayer) {
      try {
        const playerData = JSON.parse(savedPlayer);
        setPlayer(playerData);
        console.log('저장된 플레이어 정보 로드:', playerData);
      } catch (error) {
        console.error('플레이어 정보 파싱 오류:', error);
      }
    }

    // 플레이어 정보 수신 (새로 받는 경우)
    socketInstance.on('player:joined', (data: { player: Player }) => {
      setPlayer(data.player);
      // sessionStorage에도 저장
      sessionStorage.setItem('player', JSON.stringify(data.player));
    });

    // 게임 상태 업데이트 시 플레이어 정보 갱신
    socketInstance.on('game:update', (data: any) => {
      // 플레이어 정보가 포함된 경우 업데이트
      if (data.data?.player) {
        setPlayer(data.data.player);
      }
    });

    return () => {
      socketInstance.off('player:joined');
      socketInstance.off('game:update');
    };
  }, [router]);

  if (!socket || !player) {
    return (
      <main className="min-h-screen bg-black text-green-400 flex items-center justify-center font-mono">
        <div className="text-center">
          <p className="text-xl mb-4">게임에 접속하는 중...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-green-400 font-mono">
      <div className="h-screen flex flex-col">
        <GameChat socket={socket} player={player} />
      </div>
    </main>
  );
}

