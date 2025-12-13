/**
 * 스킬 시스템
 * 플레이어 스킬 사용, 쿨다운 관리를 담당합니다.
 */

import { GameState } from './state';
import { Player, Skill, SkillType, GameResult } from './types';

export class SkillSystem {
  private gameState: GameState;
  private skills: Map<string, Skill>;
  private playerSkillCooldowns: Map<string, Map<string, number>>; // playerId -> skillId -> remaining cooldown
  
  constructor(gameState: GameState) {
    this.gameState = gameState;
    this.skills = new Map();
    this.playerSkillCooldowns = new Map();
    this.initializeSkills();
  }
  
  /**
   * 기본 스킬 초기화
   */
  private initializeSkills(): void {
    const defaultSkills: Skill[] = [
      {
        id: 'power_strike',
        name: '강타',
        type: SkillType.POWER_STRIKE,
        description: '강력한 공격을 가합니다. (데미지 1.5배, MP 10 소모)',
        mpCost: 10,
        cooldown: 3, // 3틱 쿨다운
        damageMultiplier: 1.5
      },
      {
        id: 'dodge',
        name: '회피',
        type: SkillType.DODGE,
        description: '다음 공격을 회피합니다. (MP 5 소모)',
        mpCost: 5,
        cooldown: 5, // 5틱 쿨다운
        effect: 'dodge_next_attack'
      }
    ];
    
    defaultSkills.forEach(skill => {
      this.skills.set(skill.id, skill);
    });
  }
  
  /**
   * 스킬 사용
   */
  useSkill(playerId: string, skillName: string): GameResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    // 스킬 찾기
    const skill = Array.from(this.skills.values()).find(
      s => s.name === skillName || s.id === skillName.toLowerCase().replace(/\s+/g, '_')
    );
    
    if (!skill) {
      return {
        success: false,
        message: `"${skillName}" 스킬을 찾을 수 없습니다.`
      };
    }
    
    // 쿨다운 확인
    if (this.isOnCooldown(playerId, skill.id)) {
      const remaining = this.getCooldown(playerId, skill.id);
      return {
        success: false,
        message: `${skill.name} 스킬의 쿨다운이 ${remaining}틱 남았습니다.`
      };
    }
    
    // MP 확인
    if (player.mp < skill.mpCost) {
      return {
        success: false,
        message: `MP가 부족합니다. (필요: ${skill.mpCost}, 보유: ${player.mp})`
      };
    }
    
    // 전투 중인지 확인
    if (!player.inCombat || !player.combatTarget) {
      return {
        success: false,
        message: '전투 중에만 스킬을 사용할 수 있습니다.'
      };
    }
    
    // MP 소모
    player.mp -= skill.mpCost;
    
    // 쿨다운 설정
    this.setCooldown(playerId, skill.id, skill.cooldown);
    
    // 스킬 효과 적용
    let message = `${skill.name} 스킬을 사용했습니다!`;
    
    if (skill.type === SkillType.POWER_STRIKE) {
      // 강타는 다음 공격에 데미지 배율 적용 (플래그 설정)
      (player as any).nextAttackMultiplier = skill.damageMultiplier || 1.5;
      message += `\n다음 공격의 데미지가 ${skill.damageMultiplier}배 증가합니다!`;
    } else if (skill.type === SkillType.DODGE) {
      // 회피는 다음 공격 회피 플래그 설정
      (player as any).dodgeNextAttack = true;
      message += `\n다음 공격을 회피할 준비가 되었습니다!`;
    }
    
    this.gameState.updatePlayer(playerId, player);
    
    return {
      success: true,
      message: message,
      data: { skill, player }
    };
  }
  
  /**
   * 쿨다운 확인
   */
  private isOnCooldown(playerId: string, skillId: string): boolean {
    const cooldown = this.getCooldown(playerId, skillId);
    return cooldown > 0;
  }
  
  /**
   * 쿨다운 조회
   */
  private getCooldown(playerId: string, skillId: string): number {
    const playerCooldowns = this.playerSkillCooldowns.get(playerId);
    if (!playerCooldowns) {
      return 0;
    }
    return playerCooldowns.get(skillId) || 0;
  }
  
  /**
   * 쿨다운 설정
   */
  private setCooldown(playerId: string, skillId: string, cooldown: number): void {
    if (!this.playerSkillCooldowns.has(playerId)) {
      this.playerSkillCooldowns.set(playerId, new Map());
    }
    const playerCooldowns = this.playerSkillCooldowns.get(playerId)!;
    playerCooldowns.set(skillId, cooldown);
  }
  
  /**
   * 틱마다 쿨다운 감소
   */
  processCooldowns(): void {
    this.playerSkillCooldowns.forEach((playerCooldowns, playerId) => {
      playerCooldowns.forEach((cooldown, skillId) => {
        if (cooldown > 0) {
          playerCooldowns.set(skillId, cooldown - 1);
        }
      });
    });
  }
  
  /**
   * 사용 가능한 스킬 목록 조회
   */
  getAvailableSkills(playerId: string): Skill[] {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return [];
    }
    
    return Array.from(this.skills.values()).filter(skill => {
      // 레벨 제한 체크 (추후 구현)
      return true;
    });
  }
  
  /**
   * 스킬 조회
   */
  getSkill(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }
}

