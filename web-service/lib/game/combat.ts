/**
 * 전투 시스템
 * 몬스터와의 전투, 데미지 계산, 승리/패배 처리를 관리합니다.
 */

import { Player, Monster, CombatResult } from './types';
import { GameState } from './state';
import { GAME_CONFIG } from './config';
import { LevelSystem } from './level';

export class CombatSystem {
  private gameState: GameState;
  private levelSystem: LevelSystem;
  
  constructor(gameState: GameState, levelSystem: LevelSystem) {
    this.gameState = gameState;
    this.levelSystem = levelSystem;
  }
  
  /**
   * 전투 시작
   */
  startCombat(playerId: string, monsterId: string): CombatResult {
    const player = this.gameState.getPlayer(playerId);
    const monster = this.gameState.getMonster(monsterId);
    
    if (!player || !monster) {
      return {
        success: false,
        message: '플레이어 또는 몬스터를 찾을 수 없습니다.'
      };
    }
    
    if (player.location !== monster.location) {
      return {
        success: false,
        message: '같은 위치에 있는 몬스터만 공격할 수 있습니다.'
      };
    }
    
    // 전투 상태 설정
    player.inCombat = true;
    player.combatTarget = monsterId;
    this.gameState.updatePlayer(playerId, player);
    
    return {
      success: true,
      message: `${monster.name}과(와) 전투를 시작했습니다!`,
      data: { monster }
    };
  }
  
  /**
   * 공격 처리
   */
  processAttack(playerId: string): CombatResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    if (!player.inCombat || !player.combatTarget) {
      return {
        success: false,
        message: '전투 중이 아닙니다.'
      };
    }
    
    const monster = this.gameState.getMonster(player.combatTarget);
    if (!monster) {
      // 몬스터가 사라진 경우 전투 종료
      player.inCombat = false;
      player.combatTarget = undefined;
      this.gameState.updatePlayer(playerId, player);
      return {
        success: false,
        message: '전투 대상이 사라졌습니다.'
      };
    }
    
    // 플레이어 공격 (레벨 보정 포함, 스킬 효과 적용)
    let baseDamage = this.calculateDamage(player.attack, monster.defense, player.level, monster.level);
    
    // 스킬 효과 적용 (강타 등)
    const multiplier = (player as any).nextAttackMultiplier || 1.0;
    if (multiplier > 1.0) {
      baseDamage = Math.floor(baseDamage * multiplier);
      (player as any).nextAttackMultiplier = undefined; // 플래그 제거
    }
    
    const playerDamage = baseDamage;
    monster.hp -= playerDamage;
    
    let resultMessage = `${monster.name}에게 ${playerDamage} 데미지를 입혔습니다!`;
    let monsterDefeated = false;
    let playerDefeated = false;
    
    // 몬스터 사망 확인
    if (monster.hp <= 0) {
      monster.hp = 0;
      monsterDefeated = true;
      
      // 경험치 및 골드 획득 (레벨 차이 보정 적용)
      const adjustedExp = this.calculateAdjustedExp(player.level, monster.level, monster.expReward);
      const expResult = this.levelSystem.gainExp(playerId, adjustedExp);
      player.gold += monster.goldReward;
      
      resultMessage += `\n${monster.name}을(를) 처치했습니다!`;
      resultMessage += `\n경험치 ${adjustedExp} 획득!`;
      resultMessage += `\n골드 ${monster.goldReward} 획득!`;
      
      if (expResult.newLevel) {
        resultMessage += `\n${expResult.message}`;
      }
      
      // 아이템 드롭 처리
      this.processItemDrop(playerId, monster);
      
      // 몬스터 제거
      this.gameState.removeMonster(monster.id);
      
      // 전투 종료
      player.inCombat = false;
      player.combatTarget = undefined;
      this.gameState.updatePlayer(playerId, player);
      
      return {
        success: true,
        message: resultMessage,
        playerHp: player.hp,
        monsterHp: 0,
        damage: playerDamage,
        monsterDefeated: true,
        playerDefeated: false
      };
    }
    
    // 몬스터 반격
    const monsterDamage = this.calculateDamage(monster.attack, player.defense);
    player.hp -= monsterDamage;
    resultMessage += `\n${monster.name}이(가) ${monsterDamage} 데미지를 입혔습니다!`;
    
    // 플레이어 사망 확인
    if (player.hp <= 0) {
      player.hp = 0;
      playerDefeated = true;
      resultMessage += `\n당신은 사망했습니다...`;
      
      // 전투 종료
      player.inCombat = false;
      player.combatTarget = undefined;
      this.gameState.updatePlayer(playerId, player);
      
      return {
        success: true,
        message: resultMessage,
        playerHp: 0,
        monsterHp: monster.hp,
        damage: playerDamage,
        monsterDefeated: false,
        playerDefeated: true
      };
    }
    
    // 상태 업데이트
    this.gameState.updatePlayer(playerId, player);
    this.gameState.addMonster(monster);
    
    return {
      success: true,
      message: resultMessage,
      playerHp: player.hp,
      monsterHp: monster.hp,
      damage: playerDamage,
      monsterDefeated: false,
      playerDefeated: false
    };
  }
  
  /**
   * 도망 처리
   */
  processFlee(playerId: string): CombatResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    if (!player.inCombat || !player.combatTarget) {
      return {
        success: false,
        message: '전투 중이 아닙니다.'
      };
    }
    
    // 도망 성공 여부 결정 (레벨 차이에 따라 조정)
    const monster = this.gameState.getMonster(player.combatTarget);
    if (!monster) {
      return {
        success: false,
        message: '전투 대상이 사라졌습니다.'
      };
    }
    
    const levelDiff = player.level - monster.level;
    let fleeRate = GAME_CONFIG.COMBAT.FLEE_SUCCESS_RATE;
    
    // 플레이어 레벨이 높으면 도망 성공률 증가
    if (levelDiff > 0) {
      fleeRate = Math.min(0.9, fleeRate + levelDiff * 0.1);
    } else if (levelDiff < 0) {
      // 플레이어 레벨이 낮으면 도망 성공률 감소
      fleeRate = Math.max(0.1, fleeRate + levelDiff * 0.1);
    }
    
    const fleeSuccess = Math.random() < fleeRate;
    
    if (fleeSuccess) {
      // 도망 성공
      player.inCombat = false;
      player.combatTarget = undefined;
      this.gameState.updatePlayer(playerId, player);
      
      return {
        success: true,
        message: '도망에 성공했습니다!',
        playerHp: player.hp,
        playerDefeated: false
      };
    } else {
      // 도망 실패 - 몬스터 공격 받음
      const monster = this.gameState.getMonster(player.combatTarget);
      if (monster) {
        const monsterDamage = this.calculateDamage(monster.attack, player.defense, monster.level, player.level);
        player.hp -= monsterDamage;
        
        let resultMessage = '도망에 실패했습니다!';
        resultMessage += `\n${monster.name}이(가) ${monsterDamage} 데미지를 입혔습니다!`;
        
        // 플레이어 사망 확인
        if (player.hp <= 0) {
          player.hp = 0;
          resultMessage += `\n당신은 사망했습니다...`;
          player.inCombat = false;
          player.combatTarget = undefined;
        }
        
        this.gameState.updatePlayer(playerId, player);
        
        return {
          success: true,
          message: resultMessage,
          playerHp: player.hp,
          playerDefeated: player.hp <= 0
        };
      }
    }
    
    return {
      success: false,
      message: '도망 처리 중 오류가 발생했습니다.'
    };
  }
  
  /**
   * 틱마다 자동으로 처리되는 전투 진행
   */
  processCombatTick(playerId: string): CombatResult | null {
    const player = this.gameState.getPlayer(playerId);
    if (!player || !player.inCombat || !player.combatTarget) {
      return null;
    }
    
    const monster = this.gameState.getMonster(player.combatTarget);
    if (!monster) {
      // 몬스터가 사라진 경우 전투 종료
      player.inCombat = false;
      player.combatTarget = undefined;
      this.gameState.updatePlayer(playerId, player);
      return {
        success: false,
        message: '전투 대상이 사라졌습니다.'
      };
    }
    
    // 플레이어와 몬스터가 같은 위치에 있는지 확인
    if (player.location !== monster.location) {
      // 위치가 다른 경우 전투 종료
      player.inCombat = false;
      player.combatTarget = undefined;
      this.gameState.updatePlayer(playerId, player);
      return {
        success: false,
        message: '전투 대상이 멀어졌습니다.'
      };
    }
    
    // 플레이어 공격 (레벨 보정 포함, 스킬 효과 적용)
    let baseDamage = this.calculateDamage(player.attack, monster.defense, player.level, monster.level);
    
    // 스킬 효과 적용 (강타 등)
    const multiplier = (player as any).nextAttackMultiplier || 1.0;
    if (multiplier > 1.0) {
      baseDamage = Math.floor(baseDamage * multiplier);
      (player as any).nextAttackMultiplier = undefined; // 플래그 제거
    }
    
    const playerDamage = baseDamage;
    monster.hp -= playerDamage;
    
    let resultMessage = this.formatCombatMessage(
      `${player.name}이(가) ${monster.name}에게 ${playerDamage} 데미지를 입혔습니다!`,
      'player_attack'
    );
    
    let monsterDefeated = false;
    let playerDefeated = false;
    
    // 몬스터 사망 확인
    if (monster.hp <= 0) {
      monster.hp = 0;
      monsterDefeated = true;
      
      // 경험치 및 골드 획득 (레벨 차이 보정 적용)
      const adjustedExp = this.calculateAdjustedExp(player.level, monster.level, monster.expReward);
      const expResult = this.levelSystem.gainExp(playerId, adjustedExp);
      player.gold += monster.goldReward;
      
      resultMessage += `\n${this.formatCombatMessage(`${monster.name}을(를) 처치했습니다!`, 'victory')}`;
      resultMessage += `\n경험치 ${adjustedExp} 획득!`;
      resultMessage += `\n골드 ${monster.goldReward} 획득!`;
      
      if (expResult.newLevel) {
        resultMessage += `\n${expResult.message}`;
      }
      
      // 아이템 드롭 처리
      this.processItemDrop(playerId, monster);
      
      // 몬스터 제거
      this.gameState.removeMonster(monster.id);
      
      // 전투 종료
      player.inCombat = false;
      player.combatTarget = undefined;
      this.gameState.updatePlayer(playerId, player);
      
      return {
        success: true,
        message: resultMessage,
        playerHp: player.hp,
        monsterHp: 0,
        damage: playerDamage,
        monsterDefeated: true,
        playerDefeated: false,
        broadcast: true
      };
    }
    
    // 몬스터 반격 (레벨 보정 포함, 회피 체크)
    let monsterDamage = this.calculateDamage(monster.attack, player.defense, monster.level, player.level);
    
    // 회피 스킬 체크
    if ((player as any).dodgeNextAttack) {
      monsterDamage = 0;
      (player as any).dodgeNextAttack = false; // 플래그 제거
      resultMessage += `\n${this.formatCombatMessage(`${player.name}이(가) 공격을 회피했습니다!`, 'dodge')}`;
    } else {
      player.hp -= monsterDamage;
      resultMessage += `\n${this.formatCombatMessage(`${monster.name}이(가) ${player.name}에게 ${monsterDamage} 데미지를 입혔습니다!`, 'monster_attack')}`;
    }
    
    // 플레이어 사망 확인
    if (player.hp <= 0) {
      player.hp = 0;
      playerDefeated = true;
      resultMessage += `\n${this.formatCombatMessage('당신은 사망했습니다...', 'defeat')}`;
      
      // 전투 종료
      player.inCombat = false;
      player.combatTarget = undefined;
      this.gameState.updatePlayer(playerId, player);
      
      return {
        success: true,
        message: resultMessage,
        playerHp: 0,
        monsterHp: monster.hp,
        damage: playerDamage,
        monsterDefeated: false,
        playerDefeated: true,
        broadcast: true
      };
    }
    
    // 상태 업데이트
    this.gameState.updatePlayer(playerId, player);
    this.gameState.addMonster(monster);
    
    return {
      success: true,
      message: resultMessage,
      playerHp: player.hp,
      monsterHp: monster.hp,
      damage: playerDamage,
      monsterDefeated: false,
      playerDefeated: false,
      broadcast: true
    };
  }
  
  /**
   * 전투 메시지 포맷팅
   */
  formatCombatMessage(message: string, type: 'player_attack' | 'monster_attack' | 'victory' | 'defeat' | 'critical' | 'dodge'): string {
    const emojiMap: { [key: string]: string } = {
      'player_attack': '⚔️',
      'monster_attack': '👹',
      'victory': '🎉',
      'defeat': '💀',
      'critical': '💥',
      'dodge': '💨'
    };
    
    return `${emojiMap[type] || ''} ${message}`;
  }
  
  /**
   * 레벨 차이에 따른 경험치 보정 계산
   */
  private calculateAdjustedExp(playerLevel: number, monsterLevel: number, baseExp: number): number {
    const levelDiff = playerLevel - monsterLevel;
    
    // 플레이어 레벨이 몬스터보다 5 이상 높으면 경험치 감소
    if (levelDiff >= 5) {
      const penalty = Math.max(0.1, 1 - (levelDiff - 4) * 0.1); // 최소 10% 경험치
      return Math.floor(baseExp * penalty);
    }
    
    // 플레이어 레벨이 몬스터보다 낮으면 보너스 (최대 1.5배)
    if (levelDiff < 0) {
      const bonus = Math.min(1.5, 1 + Math.abs(levelDiff) * 0.1);
      return Math.floor(baseExp * bonus);
    }
    
    return baseExp;
  }
  
  /**
   * 아이템 드롭 처리
   */
  private processItemDrop(playerId: string, monster: Monster): void {
    if (!monster.dropItems || monster.dropItems.length === 0) {
      return;
    }
    
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return;
    }
    
    // 드롭 아이템 처리
    monster.dropItems.forEach(dropItem => {
      if (Math.random() < dropItem.dropRate) {
        const item = this.gameState.getItem(dropItem.itemId);
        if (item) {
          // 인벤토리 공간 확인
          if (player.inventory.length < 20) {
            player.inventory.push(item);
          } else {
            // 인벤토리가 가득 차면 위치에 배치
            const location = this.gameState.getLocation(player.location);
            if (location) {
              location.items.push(item.id);
            }
          }
        }
      }
    });
    
    this.gameState.updatePlayer(playerId, player);
  }
  
  /**
   * 전투 상태 조회
   */
  getCombatStatus(playerId: string): { playerHp: number; playerMaxHp: number; playerMp: number; playerMaxMp: number; monsterHp: number; monsterMaxHp: number; monsterName: string } | null {
    const player = this.gameState.getPlayer(playerId);
    if (!player || !player.inCombat || !player.combatTarget) {
      return null;
    }
    
    const monster = this.gameState.getMonster(player.combatTarget);
    if (!monster) {
      return null;
    }
    
    return {
      playerHp: player.hp,
      playerMaxHp: player.maxHp,
      playerMp: player.mp,
      playerMaxMp: player.maxMp,
      monsterHp: monster.hp,
      monsterMaxHp: monster.maxHp,
      monsterName: monster.name
    };
  }
  
  /**
   * 데미지 계산 (레벨 차이 보정 포함)
   */
  calculateDamage(attack: number, defense: number, attackerLevel?: number, defenderLevel?: number): number {
    // 기본 데미지 = 공격력 - 방어력
    let damage = Math.max(1, attack - defense);
    
    // 레벨 차이 보정
    if (attackerLevel !== undefined && defenderLevel !== undefined) {
      const levelDiff = attackerLevel - defenderLevel;
      if (levelDiff > 0) {
        // 공격자가 레벨이 높으면 데미지 증가 (최대 1.5배)
        const multiplier = Math.min(1.5, 1 + levelDiff * 0.05);
        damage = Math.floor(damage * multiplier);
      } else if (levelDiff < 0) {
        // 공격자가 레벨이 낮으면 데미지 감소 (최소 0.5배)
        const multiplier = Math.max(0.5, 1 + levelDiff * 0.05);
        damage = Math.floor(damage * multiplier);
      }
    }
    
    // 랜덤 변동 ±20%
    const variance = 1 + (Math.random() * 2 - 1) * GAME_CONFIG.COMBAT.DAMAGE_VARIANCE;
    damage = Math.floor(damage * variance);
    
    // 최소 데미지 보장
    return Math.max(GAME_CONFIG.COMBAT.MIN_DAMAGE, damage);
  }
}

