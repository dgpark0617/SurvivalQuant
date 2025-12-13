/**
 * 인벤토리 시스템
 * 아이템 수집, 사용, 버리기를 관리합니다.
 */

import { Player, Item, GameResult } from './types';
import { GameState } from './state';
import { GAME_CONFIG } from './config';

export class InventorySystem {
  private gameState: GameState;
  
  constructor(gameState: GameState) {
    this.gameState = gameState;
  }
  
  /**
   * 아이템 획득
   */
  getItem(playerId: string, itemName: string): GameResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    // 현재 위치의 아이템 찾기
    const location = this.gameState.getLocation(player.location);
    if (!location) {
      return {
        success: false,
        message: '위치를 찾을 수 없습니다.'
      };
    }
    
    // 위치의 아이템 중에서 이름으로 검색
    const itemInLocation = location.items
      .map(itemId => this.gameState.getItem(itemId))
      .find(item => item && item.name.toLowerCase() === itemName.toLowerCase());
    
    if (!itemInLocation) {
      return {
        success: false,
        message: `"${itemName}"을(를) 찾을 수 없습니다.`
      };
    }
    
    // 인벤토리 공간 확인
    if (player.inventory.length >= GAME_CONFIG.PLAYER.MAX_INVENTORY) {
      return {
        success: false,
        message: '인벤토리가 가득 찼습니다.'
      };
    }
    
    // 아이템을 인벤토리에 추가
    player.inventory.push(itemInLocation);
    
    // 위치에서 아이템 제거
    location.items = location.items.filter(id => id !== itemInLocation.id);
    
    // 상태 업데이트
    this.gameState.updatePlayer(playerId, player);
    this.gameState.addLocation(location);
    
    return {
      success: true,
      message: `${itemInLocation.name}을(를) 획득했습니다!`,
      data: { item: itemInLocation }
    };
  }
  
  /**
   * 아이템 사용
   */
  useItem(playerId: string, itemName: string): GameResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    // 인벤토리에서 아이템 찾기
    const itemIndex = player.inventory.findIndex(
      item => item.name.toLowerCase() === itemName.toLowerCase()
    );
    
    if (itemIndex === -1) {
      return {
        success: false,
        message: `"${itemName}"을(를) 소지하고 있지 않습니다.`
      };
    }
    
    const item = player.inventory[itemIndex];
    
    // 소비 아이템만 사용 가능
    if (item.type !== 'consumable') {
      return {
        success: false,
        message: `${item.name}은(는) 사용할 수 없는 아이템입니다.`
      };
    }
    
    // 아이템 효과 적용
    if (item.effects) {
      let effectMessages: string[] = [];
      
      item.effects.forEach(effect => {
        switch (effect.type) {
          case 'hp':
            const hpBefore = player.hp;
            player.hp = Math.min(player.maxHp, player.hp + effect.value);
            effectMessages.push(`HP가 ${player.hp - hpBefore} 회복되었습니다.`);
            break;
          case 'mp':
            const mpBefore = player.mp;
            player.mp = Math.min(player.maxMp, player.mp + effect.value);
            effectMessages.push(`MP가 ${player.mp - mpBefore} 회복되었습니다.`);
            break;
          case 'attack':
            player.attack += effect.value;
            effectMessages.push(`공격력이 ${effect.value} 증가했습니다.`);
            break;
          case 'defense':
            player.defense += effect.value;
            effectMessages.push(`방어력이 ${effect.value} 증가했습니다.`);
            break;
        }
      });
      
      // 아이템 제거 (소비 아이템이므로)
      player.inventory.splice(itemIndex, 1);
      
      // 상태 업데이트
      this.gameState.updatePlayer(playerId, player);
      
      return {
        success: true,
        message: `${item.name}을(를) 사용했습니다.\n${effectMessages.join('\n')}`,
        data: { effects: item.effects }
      };
    }
    
    return {
      success: false,
      message: `${item.name}은(는) 효과가 없는 아이템입니다.`
    };
  }
  
  /**
   * 아이템 버리기
   */
  dropItem(playerId: string, itemName: string): GameResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    // 인벤토리에서 아이템 찾기
    const itemIndex = player.inventory.findIndex(
      item => item.name.toLowerCase() === itemName.toLowerCase()
    );
    
    if (itemIndex === -1) {
      return {
        success: false,
        message: `"${itemName}"을(를) 소지하고 있지 않습니다.`
      };
    }
    
    const item = player.inventory[itemIndex];
    
    // 인벤토리에서 제거
    player.inventory.splice(itemIndex, 1);
    
    // 현재 위치에 아이템 배치
    const location = this.gameState.getLocation(player.location);
    if (location) {
      location.items.push(item.id);
      this.gameState.addLocation(location);
    }
    
    // 상태 업데이트
    this.gameState.updatePlayer(playerId, player);
    
    return {
      success: true,
      message: `${item.name}을(를) 버렸습니다.`,
      data: { item }
    };
  }
  
  /**
   * 인벤토리 조회
   */
  getInventory(playerId: string): Item[] {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return [];
    }
    return player.inventory;
  }
}

