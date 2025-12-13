/**
 * NPC 시스템
 * NPC 상호작용 (대화, 퀘스트, 상점, 회복)을 관리합니다.
 */

import { Player, NPC, NPCType, GameResult } from './types';
import { GameState } from './state';
import { QuestSystem } from './quest';

export class NPCSystem {
  private gameState: GameState;
  private questSystem: QuestSystem;
  private npcs: Map<string, NPC>;
  
  constructor(gameState: GameState, questSystem: QuestSystem) {
    this.gameState = gameState;
    this.questSystem = questSystem;
    this.npcs = new Map();
    this.initializeNPCs();
  }
  
  /**
   * 초기 NPC 생성
   */
  private initializeNPCs(): void {
    const npcs: NPC[] = [
      {
        id: 'quest_giver',
        name: '퀘스트 제공자',
        type: NPCType.QUEST_GIVER,
        description: '모험가들에게 퀘스트를 제공하는 친절한 사람입니다.',
        dialogue: [
          '안녕하세요, 모험가님!',
          '마을 주변에 몬스터들이 많이 나타나고 있어요.',
          '도와주시면 감사하겠습니다!',
          '퀘스트를 확인하려면 "퀘스트" 명령어를 사용하세요.'
        ],
        location: 'town_square',
        quests: ['quest_001', 'quest_002']
      },
      {
        id: 'shopkeeper',
        name: '상점 주인',
        type: NPCType.SHOPKEEPER,
        description: '다양한 아이템을 판매하는 상점 주인입니다.',
        dialogue: [
          '어서오세요!',
          '필요한 아이템이 있으시면 말씀해주세요.',
          '현재 판매 중인 아이템을 보려면 "상점" 명령어를 사용하세요.'
        ],
        location: 'east_shop',
        shopItems: ['health_potion_1', 'iron_sword']
      },
      {
        id: 'innkeeper',
        name: '여관 주인',
        type: NPCType.INNKEEPER,
        description: '여관을 운영하는 따뜻한 주인입니다.',
        dialogue: [
          '어서오세요, 여관입니다!',
          '휴식을 취하시면 HP와 MP를 모두 회복할 수 있습니다.',
          '회복하려면 "회복" 명령어를 사용하세요. (비용: 10골드)'
        ],
        location: 'west_inn',
        healCost: 10
      }
    ];
    
    npcs.forEach(npc => {
      this.npcs.set(npc.id, npc);
    });
  }
  
  /**
   * NPC 대화
   */
  talkToNPC(playerId: string, npcId: string): GameResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    const npc = this.npcs.get(npcId);
    if (!npc) {
      return {
        success: false,
        message: `"${npcId}" NPC를 찾을 수 없습니다.`
      };
    }
    
    // NPC가 같은 위치에 있는지 확인
    if (npc.location !== player.location) {
      return {
        success: false,
        message: `${npc.name}은(는) 여기에 없습니다.`
      };
    }
    
    // NPC 타입에 따른 대화 및 기능 안내
    let message = `\n${npc.name}: ${npc.description}\n\n`;
    message += `[대화]\n`;
    npc.dialogue.forEach((line, index) => {
      message += `${line}\n`;
    });
    message += `\n`;
    
    // NPC 타입별 기능 안내
    switch (npc.type) {
      case NPCType.QUEST_GIVER:
        if (npc.quests && npc.quests.length > 0) {
          message += `💡 "퀘스트" 명령어로 사용 가능한 퀘스트를 확인할 수 있습니다.\n`;
        }
        break;
      case NPCType.SHOPKEEPER:
        message += `💡 "상점" 명령어로 상점을 열 수 있습니다.\n`;
        break;
      case NPCType.INNKEEPER:
        message += `💡 "회복" 명령어로 HP와 MP를 모두 회복할 수 있습니다. (비용: ${npc.healCost}골드)\n`;
        break;
    }
    
    return {
      success: true,
      message: message.trim()
    };
  }
  
  /**
   * 상점 열기
   */
  openShop(playerId: string, npcId: string): GameResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    const npc = this.npcs.get(npcId);
    if (!npc || npc.type !== NPCType.SHOPKEEPER) {
      return {
        success: false,
        message: '상점 주인이 아닙니다.'
      };
    }
    
    if (npc.location !== player.location) {
      return {
        success: false,
        message: '상점 주인이 여기에 없습니다.'
      };
    }
    
    if (!npc.shopItems || npc.shopItems.length === 0) {
      return {
        success: true,
        message: '현재 판매 중인 아이템이 없습니다.'
      };
    }
    
    let message = `\n${'='.repeat(50)}\n`;
    message += `${npc.name}의 상점\n`;
    message += `${'='.repeat(50)}\n\n`;
    message += `[판매 아이템]\n`;
    
    npc.shopItems.forEach(itemId => {
      const item = this.gameState.getItem(itemId);
      if (item) {
        message += `  - ${item.name}: ${item.description} (${item.value}골드)\n`;
      }
    });
    
    message += `\n💡 구매하려면: "구매 [아이템명]" (예: 구매 체력포션)\n`;
    message += `💡 판매하려면: "판매 [아이템명]" (예: 판매 체력포션)\n`;
    message += `${'='.repeat(50)}\n`;
    
    return {
      success: true,
      message: message.trim(),
      data: { npc, shopItems: npc.shopItems.map(id => this.gameState.getItem(id)).filter(Boolean) }
    };
  }
  
  /**
   * 아이템 구매
   */
  buyItem(playerId: string, npcId: string, itemName: string): GameResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    const npc = this.npcs.get(npcId);
    if (!npc || npc.type !== NPCType.SHOPKEEPER) {
      return {
        success: false,
        message: '상점 주인이 아닙니다.'
      };
    }
    
    if (npc.location !== player.location) {
      return {
        success: false,
        message: '상점 주인이 여기에 없습니다.'
      };
    }
    
    // 상점 아이템 찾기
    const shopItem = npc.shopItems
      ?.map(itemId => this.gameState.getItem(itemId))
      .find(item => item && item.name.toLowerCase().includes(itemName.toLowerCase()));
    
    if (!shopItem) {
      return {
        success: false,
        message: `"${itemName}"은(는) 판매하지 않습니다.`
      };
    }
    
    // 골드 확인
    if (player.gold < shopItem.value) {
      return {
        success: false,
        message: `골드가 부족합니다. (필요: ${shopItem.value}골드, 보유: ${player.gold}골드)`
      };
    }
    
    // 인벤토리 공간 확인
    if (player.inventory.length >= 20) {
      return {
        success: false,
        message: '인벤토리가 가득 찼습니다.'
      };
    }
    
    // 구매 처리
    player.gold -= shopItem.value;
    player.inventory.push(shopItem);
    this.gameState.updatePlayer(playerId, player);
    
    return {
      success: true,
      message: `${shopItem.name}을(를) ${shopItem.value}골드에 구매했습니다!`
    };
  }
  
  /**
   * 아이템 판매
   */
  sellItem(playerId: string, npcId: string, itemName: string): GameResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    const npc = this.npcs.get(npcId);
    if (!npc || npc.type !== NPCType.SHOPKEEPER) {
      return {
        success: false,
        message: '상점 주인이 아닙니다.'
      };
    }
    
    if (npc.location !== player.location) {
      return {
        success: false,
        message: '상점 주인이 여기에 없습니다.'
      };
    }
    
    // 인벤토리에서 아이템 찾기
    const itemIndex = player.inventory.findIndex(
      item => item.name.toLowerCase().includes(itemName.toLowerCase())
    );
    
    if (itemIndex === -1) {
      return {
        success: false,
        message: `"${itemName}"을(를) 소지하고 있지 않습니다.`
      };
    }
    
    const item = player.inventory[itemIndex];
    const sellPrice = Math.floor(item.value * 0.5); // 판매 가격은 구매 가격의 50%
    
    // 판매 처리
    player.gold += sellPrice;
    player.inventory.splice(itemIndex, 1);
    this.gameState.updatePlayer(playerId, player);
    
    return {
      success: true,
      message: `${item.name}을(를) ${sellPrice}골드에 판매했습니다!`
    };
  }
  
  /**
   * 회복 (여관)
   */
  heal(playerId: string, npcId: string): GameResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    const npc = this.npcs.get(npcId);
    if (!npc || npc.type !== NPCType.INNKEEPER) {
      return {
        success: false,
        message: '여관 주인이 아닙니다.'
      };
    }
    
    if (npc.location !== player.location) {
      return {
        success: false,
        message: '여관 주인이 여기에 없습니다.'
      };
    }
    
    // 이미 최대 HP/MP인지 확인
    if (player.hp >= player.maxHp && player.mp >= player.maxMp) {
      return {
        success: false,
        message: '이미 HP와 MP가 모두 최대입니다.'
      };
    }
    
    // 골드 확인
    const cost = npc.healCost || 10;
    if (player.gold < cost) {
      return {
        success: false,
        message: `골드가 부족합니다. (필요: ${cost}골드, 보유: ${player.gold}골드)`
      };
    }
    
    // 회복 처리
    const hpBefore = player.hp;
    const mpBefore = player.mp;
    player.hp = player.maxHp;
    player.mp = player.maxMp;
    player.gold -= cost;
    this.gameState.updatePlayer(playerId, player);
    
    return {
      success: true,
      message: `${cost}골드를 지불하고 휴식을 취했습니다!\nHP ${hpBefore} → ${player.maxHp}\nMP ${mpBefore} → ${player.maxMp}`
    };
  }
  
  /**
   * 위치의 NPC 조회
   */
  getNPCsInLocation(locationId: string): NPC[] {
    return Array.from(this.npcs.values()).filter(npc => npc.location === locationId);
  }
  
  /**
   * NPC 조회
   */
  getNPC(npcId: string): NPC | undefined {
    return this.npcs.get(npcId);
  }
}

