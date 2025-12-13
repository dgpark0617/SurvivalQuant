/**
 * 틱 시스템
 * 게임 서버의 시간 단위인 틱을 관리하고, 각 틱마다 전투 등을 처리합니다.
 */

import { GameState } from './state';
import { CombatSystem } from './combat';
import { SpawnSystem } from './spawn';

export class TickSystem {
  private gameState: GameState;
  private combatSystem: CombatSystem;
  private spawnSystem: SpawnSystem | null;
  private skillSystem: SkillSystem | null;
  private tickInterval: NodeJS.Timeout | null = null;
  private tickCount: number = 0;
  private readonly TICK_INTERVAL_MS = 3000; // 3초마다 틱 발생
  
  constructor(
    gameState: GameState,
    combatSystem: CombatSystem,
    spawnSystem: SpawnSystem | null = null,
    skillSystem: SkillSystem | null = null
  ) {
    this.gameState = gameState;
    this.combatSystem = combatSystem;
    this.spawnSystem = spawnSystem;
    this.skillSystem = skillSystem;
  }
  
  /**
   * 스폰 시스템 설정
   */
  setSpawnSystem(spawnSystem: SpawnSystem): void {
    this.spawnSystem = spawnSystem;
  }
  
  /**
   * 스킬 시스템 설정
   */
  setSkillSystem(skillSystem: SkillSystem): void {
    this.skillSystem = skillSystem;
  }
  
  /**
   * 틱 시스템 시작
   */
  start(): void {
    if (this.tickInterval) {
      return; // 이미 시작됨
    }
    
    console.log('틱 시스템 시작 (3초 간격)');
    
    this.tickInterval = setInterval(() => {
      this.processTick();
    }, this.TICK_INTERVAL_MS);
  }
  
  /**
   * 틱 시스템 중지
   */
  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
      console.log('틱 시스템 중지');
    }
  }
  
  /**
   * 각 틱마다 처리할 작업
   */
  private processTick(): void {
    this.tickCount++;
    
    // 전투 중인 플레이어들 처리
    this.processCombatTicks();
    
    // 몬스터 스폰 체크
    if (this.spawnSystem) {
      this.spawnSystem.processSpawnTick();
    }
    
    // 스킬 쿨다운 감소
    if (this.skillSystem) {
      this.skillSystem.processCooldowns();
    }
  }
  
  /**
   * 전투 중인 모든 플레이어에 대해 틱 처리
   */
  private processCombatTicks(): void {
    const players = this.gameState.getAllPlayers();
    
    players.forEach(player => {
      if (player.inCombat && player.combatTarget) {
        // 틱마다 자동으로 전투 진행
        this.combatSystem.processCombatTick(player.id);
      }
    });
  }
  
  /**
   * 현재 틱 카운트 반환
   */
  getTickCount(): number {
    return this.tickCount;
  }
}

