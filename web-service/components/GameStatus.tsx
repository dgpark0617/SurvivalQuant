'use client';

import { Player } from '@/lib/game/types';

interface GameStatusProps {
  player: Player | null;
}

export default function GameStatus({ player }: GameStatusProps) {
  if (!player) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <p className="text-gray-400">플레이어 정보를 불러오는 중...</p>
      </div>
    );
  }

  const hpPercent = (player.hp / player.maxHp) * 100;
  const mpPercent = (player.mp / player.maxMp) * 100;
  const expPercent = (player.exp / player.expToNext) * 100;

  return (
    <div className="bg-gray-800 p-6 rounded-lg space-y-4">
      <h2 className="text-2xl font-bold mb-4">플레이어 상태</h2>
      
      <div>
        <div className="flex justify-between mb-1">
          <span className="font-semibold">{player.name}</span>
          <span className="text-gray-400">레벨 {player.level}</span>
        </div>
      </div>

      <div>
        <div className="flex justify-between mb-1">
          <span>HP</span>
          <span>{player.hp} / {player.maxHp}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all ${
              hpPercent > 50 ? 'bg-green-600' : hpPercent > 25 ? 'bg-yellow-600' : 'bg-red-600'
            }`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between mb-1">
          <span>MP</span>
          <span>{player.mp} / {player.maxMp}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-4">
          <div
            className="bg-blue-600 h-4 rounded-full transition-all"
            style={{ width: `${mpPercent}%` }}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between mb-1">
          <span>경험치</span>
          <span>{player.exp} / {player.expToNext}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-4">
          <div
            className="bg-purple-600 h-4 rounded-full transition-all"
            style={{ width: `${expPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
        <div>
          <div className="text-gray-400 text-sm">공격력</div>
          <div className="text-xl font-bold">{player.attack}</div>
        </div>
        <div>
          <div className="text-gray-400 text-sm">방어력</div>
          <div className="text-xl font-bold">{player.defense}</div>
        </div>
        <div>
          <div className="text-gray-400 text-sm">골드</div>
          <div className="text-xl font-bold">{player.gold}</div>
        </div>
        <div>
          <div className="text-gray-400 text-sm">인벤토리</div>
          <div className="text-xl font-bold">{player.inventory.length} / 20</div>
        </div>
      </div>

      {player.inCombat && (
        <div className="pt-4 border-t border-gray-700">
          <div className="bg-red-900 text-red-200 p-3 rounded">
            ⚔️ 전투 중
          </div>
        </div>
      )}
    </div>
  );
}

