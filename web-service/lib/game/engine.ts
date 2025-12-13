/**
 * 게임 엔진
 * 모든 게임 로직의 중앙 조정자
 * 플레이어 액션 처리 및 게임 상태 업데이트를 담당합니다.
 */

import { 
  Player, 
  ParsedCommand, 
  GameResult, 
  GameAction,
  LocationInfo,
  NPCType
} from './types';
import { GameState } from './state';
import { LevelSystem } from './level';
import { CombatSystem } from './combat';
import { InventorySystem } from './inventory';
import { MapSystem } from './map';
import { QuestSystem } from './quest';
import { NPCSystem } from './npc';
import { TickSystem } from './tick';
import { SpawnSystem } from './spawn';
import { SkillSystem } from './skills';
import { GAME_CONFIG } from './config';

class GameEngine {
  private gameState: GameState;
  private levelSystem: LevelSystem;
  private combatSystem: CombatSystem;
  private inventorySystem: InventorySystem;
  private mapSystem: MapSystem;
  private questSystem: QuestSystem;
  private npcSystem: NPCSystem;
  private tickSystem: TickSystem;
  private spawnSystem: SpawnSystem;
  private skillSystem: SkillSystem;
  
  constructor() {
    this.gameState = new GameState();
    this.levelSystem = new LevelSystem(this.gameState);
    this.combatSystem = new CombatSystem(this.gameState, this.levelSystem);
    this.inventorySystem = new InventorySystem(this.gameState);
    this.mapSystem = new MapSystem(this.gameState);
    this.questSystem = new QuestSystem(this.gameState, this.levelSystem, this.inventorySystem);
    this.npcSystem = new NPCSystem(this.gameState, this.questSystem);
    this.spawnSystem = new SpawnSystem(this.gameState);
    this.skillSystem = new SkillSystem(this.gameState);
    
    // 틱 시스템 초기화
    this.tickSystem = new TickSystem(this.gameState, this.combatSystem, this.spawnSystem, this.skillSystem);
    this.tickSystem.start();
  }
  
  /**
   * 틱 시스템 반환 (서버에서 사용)
   */
  getTickSystem(): TickSystem {
    return this.tickSystem;
  }
  
  /**
   * 틱 처리 결과를 Socket.io로 전송하기 위한 메서드
   */
  processTickResults(io: any): void {
    const players = this.gameState.getAllPlayers();
    
    players.forEach(player => {
      if (player.inCombat && player.combatTarget) {
        const result = this.combatSystem.processCombatTick(player.id);
        if (result && result.broadcast) {
          // 전투 로그를 해당 플레이어에게 전송
          io.to(player.id).emit('game:combat', {
            message: result.message,
            playerHp: result.playerHp,
            monsterHp: result.monsterHp,
            monsterDefeated: result.monsterDefeated,
            playerDefeated: result.playerDefeated
          });
          
          // 전투 상태 업데이트
          const combatStatus = this.combatSystem.getCombatStatus(player.id);
          if (combatStatus) {
            io.to(player.id).emit('game:combat_status', combatStatus);
          }
          
          // 플레이어 상태 업데이트
          io.to(player.id).emit('game:update', {
            type: 'combat',
            data: { player: this.gameState.getPlayer(player.id) },
            message: result.message
          });
        }
      }
    });
  }
  
  /**
   * 플레이어 접속 처리
   */
  handlePlayerJoin(socketId: string, name: string): Player {
    // 시작 위치 가져오기
    const startLocation = this.mapSystem.getStartLocation();
    if (!startLocation) {
      throw new Error('시작 위치를 찾을 수 없습니다.');
    }
    
    // 플레이어 생성
    const player: Player = {
      id: socketId,
      name: name,
      level: GAME_CONFIG.PLAYER.INITIAL_LEVEL,
      exp: 0,
      expToNext: 0,
      hp: GAME_CONFIG.PLAYER.INITIAL_HP,
      maxHp: GAME_CONFIG.PLAYER.INITIAL_HP,
      mp: GAME_CONFIG.PLAYER.INITIAL_MP,
      maxMp: GAME_CONFIG.PLAYER.INITIAL_MP,
      attack: GAME_CONFIG.PLAYER.INITIAL_ATTACK,
      defense: GAME_CONFIG.PLAYER.INITIAL_DEFENSE,
      location: startLocation.id,
      inventory: [],
      gold: GAME_CONFIG.PLAYER.INITIAL_GOLD,
      activeQuests: [],
      completedQuests: [],
      inCombat: false,
      visitedLocations: [startLocation.id], // 시작 위치를 방문한 지역으로 추가
      createdAt: new Date(),
      lastActive: new Date()
    };
    
    // 경험치 초기화
    this.levelSystem.initializePlayerExp(player);
    
    // 플레이어 추가
    this.gameState.addPlayer(player);
    
    return player;
  }
  
  /**
   * 플레이어 연결 해제 처리
   */
  handlePlayerDisconnect(playerId: string): void {
    this.gameState.removePlayer(playerId);
  }
  
  /**
   * 명령어 처리
   */
  handleCommand(playerId: string, command: ParsedCommand): GameResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    switch (command.action) {
      case GameAction.MOVE:
        return this.handleMove(playerId, command.args[0] || '');
        
      case GameAction.ATTACK:
        return this.combatSystem.processAttack(playerId);
        
      case GameAction.FLEE:
        return this.combatSystem.processFlee(playerId);
        
      case GameAction.FIGHT:
        return this.handleFightStart(playerId, command.args.join(' '));
        
      case GameAction.INVENTORY:
        return this.handleInventory(playerId);
        
      case GameAction.GET_ITEM:
        return this.inventorySystem.getItem(playerId, command.args.join(' '));
        
      case GameAction.USE_ITEM:
        return this.inventorySystem.useItem(playerId, command.args.join(' '));
        
      case GameAction.DROP_ITEM:
        return this.inventorySystem.dropItem(playerId, command.args.join(' '));
        
      case GameAction.STATUS:
        return this.handleStatus(playerId);
        
      case GameAction.LOOK:
        return this.handleLook(playerId);
        
      case GameAction.HELP:
        return this.handleHelp();
        
      case GameAction.QUEST:
        return this.handleQuestList(playerId);
        
      case GameAction.QUEST_ACCEPT:
        return this.questSystem.acceptQuest(playerId, command.args.join(' '));
        
      case GameAction.TALK:
        return this.handleTalk(playerId, command.args.join(' '));
        
      case GameAction.SHOP:
        return this.handleShop(playerId, command.args.join(' '));
        
      case GameAction.BUY:
        return this.handleBuy(playerId, command.args.join(' '));
        
      case GameAction.SELL:
        return this.handleSell(playerId, command.args.join(' '));
        
      case GameAction.HEAL:
        return this.handleHeal(playerId, command.args.join(' '));
        
      case GameAction.LOOK_AT:
        return this.handleLookAt(playerId, command.args.join(' '));
        
      case GameAction.MAP:
        return this.handleMap(playerId);
        
      case GameAction.SKILL:
        return this.handleSkill(playerId, command.args.join(' '));
        
      case GameAction.SHOUT:
        return this.handleShout(playerId, command.args.join(' '));
        
      case GameAction.CHAT:
        // 일반 채팅은 Socket.io에서 직접 처리
        return {
          success: true,
          message: command.original,
          broadcast: true
        };
        
      default:
        return {
          success: false,
          message: `알 수 없는 명령어입니다. "도움말"을 입력하여 명령어 목록을 확인하세요.`
        };
    }
  }
  
  /**
   * 이동 처리
   */
  handleMove(playerId: string, direction: string): GameResult {
    if (!direction) {
      return {
        success: false,
        message: '이동할 방향을 지정해주세요. (예: 이동 북, 이동 남)'
      };
    }
    
    const moveResult = this.mapSystem.movePlayer(playerId, direction);
    
    // 이동 성공 시 자동으로 새 위치 정보 표시
    if (moveResult.success && moveResult.newLocation) {
      const lookResult = this.handleLook(playerId);
      if (lookResult.success) {
        // 이동 메시지와 방 정보를 함께 표시
        moveResult.message = `${moveResult.message}\n\n${lookResult.message}`;
        moveResult.data = { ...moveResult.data, locationInfo: lookResult.data?.locationInfo };
      }
    }
    
    return moveResult;
  }
  
  /**
   * 전투 시작 처리
   */
  handleFightStart(playerId: string, monsterName: string): GameResult {
    if (!monsterName) {
      return {
        success: false,
        message: '전투할 몬스터를 지정해주세요. (예: 전투 고블린)'
      };
    }
    
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    // 현재 위치의 몬스터 찾기
    const monsters = this.gameState.getMonstersInLocation(player.location);
    const monster = monsters.find(m => 
      m.name.toLowerCase().includes(monsterName.toLowerCase())
    );
    
    if (!monster) {
      return {
        success: false,
        message: `"${monsterName}"을(를) 찾을 수 없습니다.`
      };
    }
    
    return this.combatSystem.startCombat(playerId, monster.id);
  }
  
  /**
   * 인벤토리 조회
   */
  handleInventory(playerId: string): GameResult {
    const items = this.inventorySystem.getInventory(playerId);
    
    if (items.length === 0) {
      return {
        success: true,
        message: '인벤토리가 비어있습니다.'
      };
    }
    
    const itemList = items.map((item, index) => 
      `${index + 1}. ${item.name} - ${item.description}`
    ).join('\n');
    
    return {
      success: true,
      message: `인벤토리 (${items.length}/${GAME_CONFIG.PLAYER.MAX_INVENTORY}):\n${itemList}`,
      data: { items }
    };
  }
  
  /**
   * 상태 조회
   */
  handleStatus(playerId: string): GameResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    const location = this.gameState.getLocation(player.location);
    const locationName = location ? location.name : '알 수 없는 위치';
    
    const status = [
      `이름: ${player.name}`,
      `레벨: ${player.level}`,
      `경험치: ${player.exp}/${player.expToNext}`,
      `HP: ${player.hp}/${player.maxHp}`,
      `MP: ${player.mp}/${player.maxMp}`,
      `공격력: ${player.attack}`,
      `방어력: ${player.defense}`,
      `골드: ${player.gold}`,
      `위치: ${locationName}`,
      `인벤토리: ${player.inventory.length}/${GAME_CONFIG.PLAYER.MAX_INVENTORY}`
    ].join('\n');
    
    return {
      success: true,
      message: status,
      data: { player }
    };
  }
  
  /**
   * 주변 정보 조회 (텍스트 머드 스타일)
   */
  handleLook(playerId: string): GameResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    const locationInfo = this.mapSystem.getLocationInfo(player.location);
    if (!locationInfo) {
      return {
        success: false,
        message: '위치 정보를 가져올 수 없습니다.'
      };
    }
    
    const { location, players, monsters, items } = locationInfo;
    
    // 텍스트 머드 스타일로 방 정보 표시
    let message = `\n${'='.repeat(50)}\n`;
    message += `${location.name}\n`;
    message += `${'='.repeat(50)}\n\n`;
    message += `${location.description}\n\n`;
    
    // 출구 정보 (방향별로 표시) - 가장 중요!
    if (location.exitDirections && Object.keys(location.exitDirections).length > 0) {
      message += `[이동 가능한 방향]\n`;
      const directionNames: { [key: string]: string } = {
        'north': '북',
        'south': '남',
        'east': '동',
        'west': '서',
        'up': '위',
        'down': '아래'
      };
      
      Object.entries(location.exitDirections).forEach(([dir, targetId]) => {
        const targetLocation = this.gameState.getLocation(targetId);
        if (targetLocation) {
          const dirName = directionNames[dir] || dir;
          message += `  → ${dirName}쪽: ${targetLocation.name}\n`;
        }
      });
      message += `\n💡 이동하려면: "이동 [방향]" (예: 이동 북)\n\n`;
    } else if (location.exits.length > 0) {
      message += `[출구] ${location.exits.length}개\n\n`;
    } else {
      message += `[출구] 없음 (이 방은 막다른 길입니다)\n\n`;
    }
    
    // 다른 플레이어
    const otherPlayers = players.filter(p => p.id !== playerId);
    if (otherPlayers.length > 0) {
      message += `[플레이어]\n`;
      otherPlayers.forEach(p => {
        message += `  - ${p.name} (레벨 ${p.level})\n`;
      });
      message += `\n`;
    }
    
    // 몬스터
    if (monsters.length > 0) {
      message += `[몬스터]\n`;
      monsters.forEach(m => {
        message += `  - ${m.name} (레벨 ${m.level}, HP: ${m.hp}/${m.maxHp})\n`;
      });
      message += `\n`;
    }
    
    // 아이템
    if (items.length > 0) {
      message += `[아이템]\n`;
      items.forEach(i => {
        message += `  - ${i.name}: ${i.description}\n`;
      });
      message += `\n`;
    }
    
    // NPC
    if (location.npcs && location.npcs.length > 0) {
      message += `[NPC]\n`;
      location.npcs.forEach(npcId => {
        message += `  - ${npcId}\n`;
      });
      message += `\n`;
    }
    
    message += `${'='.repeat(50)}\n`;
    
    return {
      success: true,
      message: message.trim(),
      data: { locationInfo }
    };
  }
  
  /**
   * 도움말
   */
  handleHelp(): GameResult {
    const helpText = [
      '=== 게임 명령어 ===',
      '',
      '【이동】',
      '  이동 [방향]',
      '  예: 이동 북, 이동 남, 이동 동, 이동 서',
      '  방향: 북, 남, 동, 서, 위, 아래',
      '',
      '【전투】',
      '  공격 - 현재 전투 중인 몬스터 공격',
      '  도망 - 전투에서 도망가기',
      '  전투 [몬스터명] - 특정 몬스터와 전투 시작',
      '  예: 전투 고블린',
      '',
      '【인벤토리】',
      '  인벤토리 - 내 가방 확인',
      '  줄기 [아이템명] - 아이템 주우기',
      '  사용 [아이템명] - 아이템 사용하기',
      '  버리기 [아이템명] - 아이템 버리기',
      '  예: 줄기 체력포션, 사용 체력포션',
      '',
      '【정보】',
      '  상태 - 내 상태 확인',
      '  주변 - 현재 위치 둘러보기',
      '  도움말 - 이 도움말 보기',
      '',
      '【퀘스트】',
      '  퀘스트 - 진행 중인 퀘스트 확인',
      '  퀘스트 수락 [퀘스트ID] - 퀘스트 수락하기',
      '  예: 퀘스트 수락 quest_001',
      '',
      '💡 팁: 명령어를 입력하지 않으면 일반 채팅이 됩니다!'
    ].join('\n');
    
    return {
      success: true,
      message: helpText
    };
  }
  
  /**
   * 퀘스트 목록 조회
   */
  handleQuestList(playerId: string): GameResult {
    const activeQuests = this.questSystem.getActiveQuests(playerId);
    const availableQuests = this.questSystem.getAvailableQuests();
    
    let message = '=== 진행 중인 퀘스트 ===\n';
    if (activeQuests.length === 0) {
      message += '없음\n';
    } else {
      activeQuests.forEach(quest => {
        message += `\n${quest.title}\n${quest.description}\n`;
        quest.objectives.forEach(obj => {
          message += `- ${obj.target}: ${obj.current}/${obj.required}\n`;
        });
      });
    }
    
    message += '\n=== 수락 가능한 퀘스트 ===\n';
    if (availableQuests.length === 0) {
      message += '없음\n';
    } else {
      availableQuests.forEach(quest => {
        message += `\n${quest.title} (ID: ${quest.id})\n${quest.description}\n`;
      });
    }
    
    return {
      success: true,
      message: message.trim()
    };
  }
  
  /**
   * NPC 대화 처리
   */
  handleTalk(playerId: string, npcName: string): GameResult {
    if (!npcName) {
      return {
        success: false,
        message: '대화할 NPC를 지정해주세요. (예: 대화 퀘스트 제공자)'
      };
    }
    
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    // 현재 위치의 NPC 찾기
    const npcs = this.npcSystem.getNPCsInLocation(player.location);
    const npc = npcs.find(n => n.name.toLowerCase().includes(npcName.toLowerCase()));
    
    if (!npc) {
      return {
        success: false,
        message: `"${npcName}"을(를) 찾을 수 없습니다.`
      };
    }
    
    return this.npcSystem.talkToNPC(playerId, npc.id);
  }
  
  /**
   * 상점 열기 처리
   */
  handleShop(playerId: string, npcName: string): GameResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    // NPC 이름이 없으면 현재 위치의 상점 주인 찾기
    let npcId = 'shopkeeper';
    if (npcName) {
      const npcs = this.npcSystem.getNPCsInLocation(player.location);
      const npc = npcs.find(n => 
        n.type === NPCType.SHOPKEEPER && n.name.toLowerCase().includes(npcName.toLowerCase())
      );
      if (npc) {
        npcId = npc.id;
      }
    }
    
    return this.npcSystem.openShop(playerId, npcId);
  }
  
  /**
   * 아이템 구매 처리
   */
  handleBuy(playerId: string, itemName: string): GameResult {
    if (!itemName) {
      return {
        success: false,
        message: '구매할 아이템을 지정해주세요. (예: 구매 체력포션)'
      };
    }
    
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    // 현재 위치의 상점 주인 찾기
    const npcs = this.npcSystem.getNPCsInLocation(player.location);
    const shopkeeper = npcs.find(n => n.type === NPCType.SHOPKEEPER);
    
    if (!shopkeeper) {
      return {
        success: false,
        message: '상점 주인이 여기에 없습니다.'
      };
    }
    
    return this.npcSystem.buyItem(playerId, shopkeeper.id, itemName);
  }
  
  /**
   * 아이템 판매 처리
   */
  handleSell(playerId: string, itemName: string): GameResult {
    if (!itemName) {
      return {
        success: false,
        message: '판매할 아이템을 지정해주세요. (예: 판매 체력포션)'
      };
    }
    
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    // 현재 위치의 상점 주인 찾기
    const npcs = this.npcSystem.getNPCsInLocation(player.location);
    const shopkeeper = npcs.find(n => n.type === NPCType.SHOPKEEPER);
    
    if (!shopkeeper) {
      return {
        success: false,
        message: '상점 주인이 여기에 없습니다.'
      };
    }
    
    return this.npcSystem.sellItem(playerId, shopkeeper.id, itemName);
  }
  
  /**
   * 회복 처리 (여관)
   */
  handleHeal(playerId: string, npcName: string): GameResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    // NPC 이름이 없으면 현재 위치의 여관 주인 찾기
    let npcId = 'innkeeper';
    if (npcName) {
      const npcs = this.npcSystem.getNPCsInLocation(player.location);
      const npc = npcs.find(n => 
        n.type === NPCType.INNKEEPER && n.name.toLowerCase().includes(npcName.toLowerCase())
      );
      if (npc) {
        npcId = npc.id;
      }
    }
    
    return this.npcSystem.heal(playerId, npcId);
  }
  
  /**
   * NPC/몬스터 관찰 처리
   */
  handleLookAt(playerId: string, targetName: string): GameResult {
    if (!targetName) {
      return {
        success: false,
        message: '관찰할 대상을 지정해주세요. (예: 보기 늑대, 보기 퀘스트 제공자)'
      };
    }
    
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    // 현재 위치의 몬스터 찾기
    const monsters = this.gameState.getMonstersInLocation(player.location);
    const monster = monsters.find(m => 
      m.name.toLowerCase().includes(targetName.toLowerCase())
    );
    
    if (monster) {
      let message = `\n${'='.repeat(50)}\n`;
      message += `${monster.name} (레벨 ${monster.level})\n`;
      message += `${'='.repeat(50)}\n\n`;
      message += `HP: ${monster.hp}/${monster.maxHp}\n`;
      message += `공격력: ${monster.attack}\n`;
      message += `방어력: ${monster.defense}\n`;
      message += `경험치 보상: ${monster.expReward}\n`;
      message += `골드 보상: ${monster.goldReward}\n`;
      
      if (monster.dropItems && monster.dropItems.length > 0) {
        message += `\n드롭 아이템:\n`;
        monster.dropItems.forEach(dropItem => {
          const item = this.gameState.getItem(dropItem.itemId);
          if (item) {
            message += `  - ${item.name} (${(dropItem.dropRate * 100).toFixed(0)}%)\n`;
          }
        });
      }
      
      return {
        success: true,
        message: message.trim()
      };
    }
    
    // 현재 위치의 NPC 찾기
    const npcs = this.npcSystem.getNPCsInLocation(player.location);
    const npc = npcs.find(n => 
      n.name.toLowerCase().includes(targetName.toLowerCase())
    );
    
    if (npc) {
      let message = `\n${'='.repeat(50)}\n`;
      message += `${npc.name}\n`;
      message += `${'='.repeat(50)}\n\n`;
      message += `${npc.description}\n\n`;
      
      message += `[대화]\n`;
      npc.dialogue.forEach((line, index) => {
        message += `${line}\n`;
      });
      message += `\n`;
      
      // NPC 타입별 정보
      if (npc.type === 'quest_giver' && npc.quests && npc.quests.length > 0) {
        message += `[제공 퀘스트]\n`;
        npc.quests.forEach(questId => {
          const quest = this.gameState.getQuest(questId);
          if (quest) {
            message += `  - ${quest.title}\n`;
          }
        });
        message += `\n`;
      }
      
      if (npc.type === 'shopkeeper' && npc.shopItems && npc.shopItems.length > 0) {
        message += `[판매 아이템]\n`;
        npc.shopItems.forEach(itemId => {
          const item = this.gameState.getItem(itemId);
          if (item) {
            message += `  - ${item.name}: ${item.value}골드\n`;
          }
        });
        message += `\n`;
      }
      
      if (npc.type === 'innkeeper' && npc.healCost) {
        message += `[회복 비용]: ${npc.healCost}골드\n`;
      }
      
      return {
        success: true,
        message: message.trim()
      };
    }
    
    return {
      success: false,
      message: `"${targetName}"을(를) 찾을 수 없습니다.`
    };
  }
  
  /**
   * 지도 보기 처리
   */
  handleMap(playerId: string): GameResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    return this.mapSystem.getMapView(playerId);
  }
  
  /**
   * 스킬 사용 처리
   */
  handleSkill(playerId: string, skillName: string): GameResult {
    if (!skillName) {
      return {
        success: false,
        message: '사용할 스킬을 지정해주세요. (예: 강타, 회피)'
      };
    }
    
    return this.skillSystem.useSkill(playerId, skillName);
  }
  
  /**
   * 외치기 처리 (전체 채팅)
   */
  handleShout(playerId: string, message: string): GameResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    if (!message || message.trim().length === 0) {
      return {
        success: false,
        message: '외칠 메시지를 입력해주세요. (예: .외치기 안녕하세요!)'
      };
    }
    
    return {
      success: true,
      message: `[외침] ${player.name}: ${message.trim()}`,
      broadcast: true,
      data: {
        type: 'shout',
        player: player.name,
        message: message.trim()
      }
    };
  }
  
  /**
   * 특정 위치의 플레이어들 조회
   */
  getPlayersInLocation(locationId: string): Player[] {
    return this.gameState.getPlayersInLocation(locationId);
  }
  
  /**
   * 플레이어 조회
   */
  getPlayer(playerId: string): Player | undefined {
    return this.gameState.getPlayer(playerId);
  }
  
  /**
   * 위치 정보 조회
   */
  getLocationInfo(locationId: string): LocationInfo | null {
    return this.mapSystem.getLocationInfo(locationId);
  }
}

export { GameEngine };

