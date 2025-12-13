/**
 * 퀘스트 시스템
 * 퀘스트 생성, 진행도 추적, 완료 처리를 관리합니다.
 */

import { Player, Quest, QuestResult, QuestType, QuestStatus } from './types';
import { GameState } from './state';
import { LevelSystem } from './level';
import { InventorySystem } from './inventory';

export class QuestSystem {
  private gameState: GameState;
  private levelSystem: LevelSystem;
  private inventorySystem: InventorySystem;
  
  constructor(gameState: GameState, levelSystem: LevelSystem, inventorySystem: InventorySystem) {
    this.gameState = gameState;
    this.levelSystem = levelSystem;
    this.inventorySystem = inventorySystem;
    this.initializeQuests();
  }
  
  /**
   * 초기 퀘스트 생성
   */
  private initializeQuests(): void {
    const quests: Quest[] = [
      {
        id: 'quest_001',
        title: '고블린 처치',
        description: '북쪽 숲의 고블린 3마리를 처치하세요.',
        type: QuestType.KILL,
        objectives: [
          { type: 'kill', target: 'goblin', current: 0, required: 3 }
        ],
        rewards: {
          exp: 100,
          gold: 50,
          items: []
        },
        status: QuestStatus.AVAILABLE
      },
      {
        id: 'quest_002',
        title: '아이템 수집',
        description: '체력 포션 2개를 수집하세요.',
        type: QuestType.COLLECT,
        objectives: [
          { type: 'collect', target: 'health_potion', current: 0, required: 2 }
        ],
        rewards: {
          exp: 50,
          gold: 30,
          items: []
        },
        status: QuestStatus.AVAILABLE
      }
    ];
    
    this.gameState.initializeQuests(quests);
  }
  
  /**
   * 퀘스트 수락
   */
  acceptQuest(playerId: string, questId: string): QuestResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    const quest = this.gameState.getQuest(questId);
    if (!quest) {
      return {
        success: false,
        message: '퀘스트를 찾을 수 없습니다.'
      };
    }
    
    if (quest.status !== QuestStatus.AVAILABLE) {
      return {
        success: false,
        message: '이 퀘스트는 이미 수락했거나 완료했습니다.'
      };
    }
    
    // 퀘스트 수락
    quest.status = QuestStatus.IN_PROGRESS;
    player.activeQuests.push(questId);
    
    // 상태 업데이트
    this.gameState.updatePlayer(playerId, player);
    this.gameState.addQuest(quest);
    
    return {
      success: true,
      message: `퀘스트 "${quest.title}"을(를) 수락했습니다!`,
      questId: quest.id,
      progress: quest.objectives
    };
  }
  
  /**
   * 퀘스트 진행도 업데이트
   */
  updateQuestProgress(playerId: string, questType: QuestType, target: string, amount: number = 1): void {
    const player = this.gameState.getPlayer(playerId);
    if (!player) return;
    
    // 진행 중인 퀘스트 확인
    player.activeQuests.forEach(questId => {
      const quest = this.gameState.getQuest(questId);
      if (!quest || quest.type !== questType) return;
      
      // 목표 업데이트
      quest.objectives.forEach(objective => {
        if (objective.target === target) {
          objective.current = Math.min(objective.current + amount, objective.required);
        }
      });
      
      // 완료 확인
      if (this.checkQuestCompletion(playerId, questId)) {
        this.completeQuest(playerId, questId);
      } else {
        this.gameState.addQuest(quest);
      }
    });
  }
  
  /**
   * 퀘스트 완료 확인
   */
  checkQuestCompletion(playerId: string, questId: string): boolean {
    const quest = this.gameState.getQuest(questId);
    if (!quest) return false;
    
    // 모든 목표가 완료되었는지 확인
    return quest.objectives.every(objective => objective.current >= objective.required);
  }
  
  /**
   * 퀘스트 완료 처리
   */
  completeQuest(playerId: string, questId: string): QuestResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    const quest = this.gameState.getQuest(questId);
    if (!quest) {
      return {
        success: false,
        message: '퀘스트를 찾을 수 없습니다.'
      };
    }
    
    // 보상 지급
    const expResult = this.levelSystem.gainExp(playerId, quest.rewards.exp);
    player.gold += quest.rewards.gold;
    
    // 아이템 보상
    if (quest.rewards.items && quest.rewards.items.length > 0) {
      // 아이템 보상은 추후 구현
    }
    
    // 퀘스트 상태 업데이트
    quest.status = QuestStatus.COMPLETED;
    player.activeQuests = player.activeQuests.filter(id => id !== questId);
    player.completedQuests.push(questId);
    
    // 상태 업데이트
    this.gameState.updatePlayer(playerId, player);
    this.gameState.addQuest(quest);
    
    let message = `퀘스트 "${quest.title}"을(를) 완료했습니다!`;
    message += `\n경험치 ${quest.rewards.exp} 획득!`;
    message += `\n골드 ${quest.rewards.gold} 획득!`;
    if (expResult.newLevel) {
      message += `\n${expResult.message}`;
    }
    
    return {
      success: true,
      message,
      questId: quest.id,
      progress: quest.objectives
    };
  }
  
  /**
   * 플레이어의 진행 중인 퀘스트 조회
   */
  getActiveQuests(playerId: string): Quest[] {
    const player = this.gameState.getPlayer(playerId);
    if (!player) return [];
    
    return player.activeQuests
      .map(questId => this.gameState.getQuest(questId))
      .filter((quest): quest is Quest => quest !== undefined);
  }
  
  /**
   * 사용 가능한 퀘스트 조회
   */
  getAvailableQuests(): Quest[] {
    return this.gameState.getAvailableQuests();
  }
}

