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
    socket.on('game:update', (data: { type: string; message: string }) => {
      addMessage('game', data.message);
    });

    // 채팅 메시지
    socket.on('chat:message', (data: { player: string; message: string; timestamp: string }) => {
      addMessage('chat', data.message, data.player);
    });

    // 에러 메시지
    socket.on('game:error', (data: { message: string }) => {
      addMessage('system', `오류: ${data.message}`);
    });

    // 게임 정보 업데이트
    socket.on('game:info', (data: any) => {
      // 위치 정보는 별도로 처리할 수 있음
    });

    // 전투 로그
    socket.on('game:combat', (data: { message: string; playerHp?: number; monsterHp?: number }) => {
      addMessage('combat', data.message);
    });

    // 전투 상태 업데이트
    socket.on('game:combat_status', (data: { playerHp: number; playerMaxHp: number; monsterHp: number; monsterMaxHp: number; monsterName: string }) => {
      // 전투 상태는 별도로 표시할 수 있음
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
    <div className="flex flex-col h-full bg-gray-800 rounded-lg overflow-hidden">
      <div className="bg-gray-700 p-4 border-b border-gray-600">
        <h3 className="font-bold">게임 채팅</h3>
        {player && <p className="text-sm text-gray-300">플레이어: {player.name}</p>}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col ${
              msg.type === 'system' ? 'items-center' :
              msg.type === 'game' ? 'items-start' :
              msg.player === player?.name ? 'items-end' : 'items-start'
            }`}
          >
            {msg.type === 'chat' && msg.player && (
              <div className="text-xs text-gray-400 mb-1">{msg.player}</div>
            )}
            <div
              className={`max-w-[80%] px-4 py-2 rounded-lg ${
                msg.type === 'system'
                  ? 'bg-yellow-900 text-yellow-200'
                  : msg.type === 'game'
                  ? 'bg-blue-900 text-blue-200'
                  : msg.type === 'combat'
                  ? 'bg-red-900 text-red-200 font-mono text-sm'
                  : msg.player === player?.name
                  ? 'bg-green-600 text-white rounded-tr-none'
                  : 'bg-gray-700 text-gray-200 rounded-tl-none'
              }`}
            >
              {msg.message.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-gray-700 border-t border-gray-600 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-4 py-2 rounded bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="명령어 또는 채팅 입력... (명령어는 /로 시작)"
          disabled={!player}
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-bold transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
          disabled={!player || !input.trim()}
        >
          전송
        </button>
      </form>
    </div>
  );
}

