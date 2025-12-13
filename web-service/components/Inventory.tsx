'use client';

import { Item } from '@/lib/game/types';

interface InventoryProps {
  items: Item[];
  onUseItem: (itemName: string) => void;
  onDropItem: (itemName: string) => void;
}

export default function Inventory({ items, onUseItem, onDropItem }: InventoryProps) {
  if (items.length === 0) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">인벤토리</h2>
        <p className="text-gray-400">인벤토리가 비어있습니다.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">인벤토리 ({items.length} / 20)</h2>
      <div className="grid grid-cols-2 gap-4">
        {items.map((item, index) => (
          <div
            key={item.id || index}
            className="bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <div className="font-semibold mb-2">{item.name}</div>
            <div className="text-sm text-gray-400 mb-2">{item.description}</div>
            <div className="flex gap-2 mt-3">
              {item.type === 'consumable' && (
                <button
                  onClick={() => onUseItem(item.name)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                >
                  사용
                </button>
              )}
              <button
                onClick={() => onDropItem(item.name)}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
              >
                버리기
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

