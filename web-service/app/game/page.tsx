'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { Socket } from 'socket.io-client';
import { Player, Item } from '@/lib/game/types';
import GameChat from '@/components/GameChat';
import GameStatus from '@/components/GameStatus';
import Inventory from '@/components/Inventory';
import CommandHelp from '@/components/CommandHelp';

export default function GamePage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [locationInfo, setLocationInfo] = useState<any>(null);
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

    // 게임 정보 수신
    socketInstance.on('game:info', (data: any) => {
      setLocationInfo(data);
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
      socketInstance.off('game:info');
      socketInstance.off('game:update');
    };
  }, []); // router는 의존성에서 제거 (변경되지 않음)

  const handleUseItem = (itemName: string) => {
    if (socket) {
      socket.emit('game:command', { command: `사용 ${itemName}` });
    }
  };

  const handleDropItem = (itemName: string) => {
    if (socket) {
      socket.emit('game:command', { command: `버리기 ${itemName}` });
    }
  };

  const handleDisconnect = () => {
    disconnectSocket();
    router.push('/');
  };

  if (!socket || !player) {
    return (
      <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">게임에 접속하는 중...</p>
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
          >
            취소
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold">⚔️ 텍스트 머드 게임</h1>
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
          >
            나가기
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 좌측: 게임 상태 및 인벤토리 */}
          <div className="space-y-4">
            <GameStatus player={player} />
            <Inventory
              items={player.inventory}
              onUseItem={handleUseItem}
              onDropItem={handleDropItem}
            />
          </div>

          {/* 중앙: 채팅 및 게임 로그 */}
          <div className="lg:col-span-2">
            <div className="h-[calc(100vh-8rem)]">
              <GameChat socket={socket} player={player} />
            </div>
          </div>
        </div>

        {/* 위치 정보 (선택사항) */}
        {locationInfo && (
          <div className="mt-4 bg-gray-800 p-4 rounded-lg">
            <h3 className="font-bold mb-2">현재 위치: {locationInfo.location?.name}</h3>
            <p className="text-gray-300 text-sm">{locationInfo.location?.description}</p>
            {locationInfo.monsters && locationInfo.monsters.length > 0 && (
              <p className="text-red-300 text-sm mt-2">
                몬스터: {locationInfo.monsters.map((m: any) => m.name).join(', ')}
              </p>
            )}
            {locationInfo.items && locationInfo.items.length > 0 && (
              <p className="text-green-300 text-sm mt-2">
                아이템: {locationInfo.items.map((i: any) => i.name).join(', ')}
              </p>
            )}
          </div>
        )}
      </div>
      
      {/* 도움말 버튼 */}
      <CommandHelp />
    </main>
  );
}

