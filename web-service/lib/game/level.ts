/**
 * 레벨업 시스템
 * 경험치 획득, 레벨업 처리, 스탯 증가를 관리합니다.
 */

import { Player, LevelResult } from './types';
import { GameState } from './state';
import { GAME_CONFIG } from './config';

export class LevelSystem {
  private gameState: GameState;
  
  constructor(gameState: GameState) {
    this.gameState = gameState;
  }
  
  /**
   * 경험치 획득
   */
  gainExp(playerId: string, amount: number): LevelResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    // 경험치 추가
    player.exp += amount;
    
    // 레벨업 가능 여부 확인
    if (player.exp >= player.expToNext) {
      return this.levelUp(playerId);
    }
    
    return {
      success: true,
      message: `${amount} 경험치를 획득했습니다. (${player.exp}/${player.expToNext})`,
      data: { exp: player.exp, expToNext: player.expToNext }
    };
  }
  
  /**
   * 레벨업 처리
   */
  levelUp(playerId: string): LevelResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    // 레벨 증가
    player.level += 1;
    
    // 초과 경험치 계산
    const excessExp = player.exp - player.expToNext;
    
    // 다음 레벨 경험치 계산
    player.expToNext = this.calculateExpToNext(player.level);
    player.exp = excessExp;
    
    // 스탯 증가
    const statIncreases = {
      hp: GAME_CONFIG.LEVEL.HP_PER_LEVEL,
      mp: GAME_CONFIG.LEVEL.MP_PER_LEVEL,
      attack: GAME_CONFIG.LEVEL.ATTACK_PER_LEVEL,
      defense: GAME_CONFIG.LEVEL.DEFENSE_PER_LEVEL
    };
    
    player.maxHp += statIncreases.hp;
    player.hp = player.maxHp; // 레벨업 시 HP 완전 회복
    player.maxMp += statIncreases.mp;
    player.mp = player.maxMp; // 레벨업 시 MP 완전 회복
    player.attack += statIncreases.attack;
    player.defense += statIncreases.defense;
    
    // 플레이어 상태 업데이트
    this.gameState.updatePlayer(playerId, player);
    
    return {
      success: true,
      message: `레벨업! 레벨 ${player.level}이 되었습니다!`,
      data: {
        newLevel: player.level,
        statIncreases
      },
      newLevel: player.level,
      statIncreases
    };
  }
  
  /**
   * 다음 레벨 경험치 계산
   */
  calculateExpToNext(level: number): number {
    return level * GAME_CONFIG.LEVEL.EXP_MULTIPLIER;
  }
  
  /**
   * 플레이어 초기 경험치 설정
   */
  initializePlayerExp(player: Player): void {
    player.exp = 0;
    player.expToNext = this.calculateExpToNext(player.level);
  }
}

