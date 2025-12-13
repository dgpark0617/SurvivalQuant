'use client';

import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Player } from '@/lib/game/types';

interface GameChatProps {
  socket: Socket;
  player: Player | null;
}

interface Message {
  type: 'system' | 'chat' | 'game' | 'combat';
  player?: string;
  message: string;
  timestamp?: string;
}

export default function GameChat({ socket, player }: GameChatProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    // 플레이어 접속 성공
    socket.on('player:joined', (data: { player: Player; message: string }) => {
      addMessage('system', data.message);
    });

    // 게임 상태 업데이트
    socket.on('game:update', (data: { type: string; message: string; data?: any }) => {
      addMessage('game', data.message);
      
      // 플레이어 상태 정보가 있으면 텍스트로 표시
      if (data.data?.player) {
        const p = data.data.player;
        addMessage('game', `[상태] HP: ${p.hp}/${p.maxHp} | MP: ${p.mp}/${p.maxMp} | 레벨: ${p.level} | 골드: ${p.gold}`);
      }
    });

    // 채팅 메시지
    socket.on('chat:message', (data: { player: string; message: string; timestamp: string }) => {
      addMessage('chat', data.message, data.player);
    });

    // 에러 메시지
    socket.on('game:error', (data: { message: string }) => {
      addMessage('system', `오류: ${data.message}`);
    });

    // 게임 정보 업데이트 (위치 정보를 텍스트로 표시)
    socket.on('game:info', (data: any) => {
      if (data.location) {
        let infoText = `\n=== ${data.location.name} ===\n${data.location.description}\n`;
        
        if (data.monsters && data.monsters.length > 0) {
          infoText += `\n[몬스터] ${data.monsters.map((m: any) => m.name).join(', ')}\n`;
        }
        
        if (data.items && data.items.length > 0) {
          infoText += `[아이템] ${data.items.map((i: any) => i.name).join(', ')}\n`;
        }
        
        if (data.exits && data.exits.length > 0) {
          infoText += `[출구] ${data.exits.join(', ')}\n`;
        }
        
        addMessage('game', infoText);
      }
    });

    // 전투 로그
    socket.on('game:combat', (data: { message: string; playerHp?: number; monsterHp?: number }) => {
      addMessage('combat', data.message);
    });

    // 전투 상태 업데이트
    socket.on('game:combat_status', (data: { playerHp: number; playerMaxHp: number; monsterHp: number; monsterMaxHp: number; monsterName: string }) => {
      addMessage('combat', `[전투] ${data.monsterName} HP: ${data.monsterHp}/${data.monsterMaxHp} | 내 HP: ${data.playerHp}/${data.playerMaxHp}`);
    });

    return () => {
      socket.off('player:joined');
      socket.off('game:update');
      socket.off('chat:message');
      socket.off('game:error');
      socket.off('game:info');
      socket.off('game:combat');
      socket.off('game:combat_status');
    };
  }, [socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (type: 'system' | 'chat' | 'game' | 'combat', message: string, playerName?: string) => {
    setMessages(prev => [...prev, {
      type,
      player: playerName,
      message,
      timestamp: new Date().toISOString()
    }]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket || !player) return;

    const command = input.trim();

    // 명령어인지 채팅인지 구분 (간단하게 '/'로 시작하면 명령어)
    if (command.startsWith('/')) {
      // 명령어 전송
      socket.emit('game:command', { command: command.substring(1) });
    } else {
      // 일반 채팅 전송
      socket.emit('chat:message', { message: command });
    }

    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-black text-green-400 font-mono">
      {/* 간단한 헤더 */}
      <div className="px-4 py-2 border-b border-green-800 text-xs">
        {player && `플레이어: ${player.name} | 레벨: ${player.level} | HP: ${player.hp}/${player.maxHp} | MP: ${player.mp}/${player.maxMp} | 골드: ${player.gold}`}
      </div>
      
      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 text-sm">
        {messages.map((msg, index) => (
          <div key={index} className="whitespace-pre-wrap">
            {msg.type === 'chat' && msg.player && (
              <span className="text-cyan-400">{msg.player}: </span>
            )}
            <span
              className={
                msg.type === 'system'
                  ? 'text-yellow-400'
                  : msg.type === 'game'
                  ? 'text-green-400'
                  : msg.type === 'combat'
                  ? 'text-red-400'
                  : msg.player === player?.name
                  ? 'text-cyan-400'
                  : 'text-green-300'
              }
            >
              {msg.message}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <form onSubmit={handleSubmit} className="px-4 py-2 border-t border-green-800 flex gap-2">
        <span className="text-green-500">$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-black text-green-400 focus:outline-none font-mono"
          placeholder="명령어 입력 (채팅은 그냥 입력, 명령어는 /로 시작)"
          disabled={!player}
          autoFocus
        />
      </form>
    </div>
  );
}

