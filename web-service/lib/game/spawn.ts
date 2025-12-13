/**
 * 몬스터 스폰 시스템
 * 몬스터 처치 후 재스폰 및 위치별 스폰 관리를 담당합니다.
 */

import { GameState } from './state';
import { Monster, Location } from './types';
import { createMonsterTemplate } from './initialData';
import { MonsterType } from './types';
import { GAME_CONFIG } from './config';

interface SpawnConfig {
  locationId: string;
  monsterIds: string[];
  spawnChance: number; // 스폰 확률 (0.0 ~ 1.0)
  maxCount: number;    // 최대 몬스터 수
}

export class SpawnSystem {
  private gameState: GameState;
  private spawnConfigs: Map<string, SpawnConfig>;
  private lastSpawnCheck: number = Date.now();
  
  constructor(gameState: GameState) {
    this.gameState = gameState;
    this.spawnConfigs = new Map();
    this.initializeSpawnConfigs();
  }
  
  /**
   * 스폰 설정 초기화
   */
  private initializeSpawnConfigs(): void {
    const locations = this.gameState.getAllLocations();
    
    locations.forEach(location => {
      if (location.monsters && location.monsters.length > 0) {
        // 위치별 스폰 설정 생성
        this.spawnConfigs.set(location.id, {
          locationId: location.id,
          monsterIds: location.monsters,
          spawnChance: 0.3, // 30% 확률
          maxCount: GAME_CONFIG.MONSTER.MAX_PER_LOCATION
        });
      }
    });
  }
  
  /**
   * 틱마다 스폰 체크
   */
  processSpawnTick(): void {
    const now = Date.now();
    const elapsed = now - this.lastSpawnCheck;
    
    // 30초마다 스폰 체크
    if (elapsed < GAME_CONFIG.MONSTER.SPAWN_INTERVAL) {
      return;
    }
    
    this.lastSpawnCheck = now;
    
    // 각 위치별로 스폰 체크
    this.spawnConfigs.forEach((config, locationId) => {
      this.checkAndSpawn(locationId, config);
    });
  }
  
  /**
   * 특정 위치의 스폰 체크 및 실행
   */
  private checkAndSpawn(locationId: string, config: SpawnConfig): void {
    const location = this.gameState.getLocation(locationId);
    if (!location) {
      return;
    }
    
    // 현재 위치의 몬스터 수 확인
    const currentMonsters = this.gameState.getMonstersInLocation(locationId);
    
    // 최대 몬스터 수에 도달했으면 스폰하지 않음
    if (currentMonsters.length >= config.maxCount) {
      return;
    }
    
    // 스폰 확률 체크
    if (Math.random() > config.spawnChance) {
      return;
    }
    
    // 스폰할 몬스터 선택
    const monsterIdTemplate = config.monsterIds[
      Math.floor(Math.random() * config.monsterIds.length)
    ];
    
    // 몬스터 레벨 결정 (위치 타입과 거리에 따라)
    let level = 1;
    const distance = Math.abs(location.x) + Math.abs(location.y);
    
    if (location.type === 'dungeon') {
      level = 4 + Math.floor(distance / 2);
    } else if (location.type === 'forest') {
      level = 1 + Math.floor(distance / 2);
    } else if (location.type === 'field') {
      level = 2 + Math.floor(distance / 2);
    }
    
    // 몬스터 타입 결정
    let monsterType = MonsterType.GOBLIN;
    let monsterName = '고블린';
    
    if (level >= 3) {
      monsterType = MonsterType.ORC;
      monsterName = '오크';
    } else if (level >= 2) {
      monsterType = MonsterType.WOLF;
      monsterName = '늑대';
    }
    
    // 고유 ID 생성
    const uniqueId = `${monsterIdTemplate}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 몬스터 생성
    const monster = createMonsterTemplate(
      uniqueId,
      monsterName,
      monsterType,
      level,
      locationId
    );
    
    // 몬스터 추가
    this.gameState.addMonster(monster);
  }
  
  /**
   * 특정 위치에 몬스터 강제 스폰 (테스트용)
   */
  forceSpawn(locationId: string, monsterId: string, level: number): void {
    const location = this.gameState.getLocation(locationId);
    if (!location) {
      return;
    }
    
    const monsterType = level >= 3 ? MonsterType.ORC : (level >= 2 ? MonsterType.WOLF : MonsterType.GOBLIN);
    const monsterName = level >= 3 ? '오크' : (level >= 2 ? '늑대' : '고블린');
    
    const uniqueId = `${monsterId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const monster = createMonsterTemplate(uniqueId, monsterName, monsterType, level, locationId);
    
    this.gameState.addMonster(monster);
  }
}

