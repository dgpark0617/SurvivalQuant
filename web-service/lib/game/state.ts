/**
 * 게임 상태 관리 시스템
 * 메모리 기반 Map 자료구조를 사용하여 게임 상태를 관리합니다.
 */

import { Player, Monster, Item, Location, Quest } from './types';

export class GameState {
  private players: Map<string, Player>;
  private monsters: Map<string, Monster>;
  private items: Map<string, Item>;
  private locations: Map<string, Location>;
  private quests: Map<string, Quest>;
  
  constructor() {
    this.players = new Map();
    this.monsters = new Map();
    this.items = new Map();
    this.locations = new Map();
    this.quests = new Map();
  }
  
  // ========== 플레이어 관리 ==========
  
  /**
   * 플레이어 추가
   */
  addPlayer(player: Player): void {
    this.players.set(player.id, player);
  }
  
  /**
   * 플레이어 조회
   */
  getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }
  
  /**
   * 플레이어 업데이트
   */
  updatePlayer(playerId: string, updates: Partial<Player>): void {
    const player = this.players.get(playerId);
    if (player) {
      Object.assign(player, updates);
      player.lastActive = new Date();
    }
  }
  
  /**
   * 플레이어 제거
   */
  removePlayer(playerId: string): void {
    this.players.delete(playerId);
  }
  
  /**
   * 모든 플레이어 조회
   */
  getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }
  
  /**
   * 특정 위치의 플레이어들 조회
   */
  getPlayersInLocation(locationId: string): Player[] {
    return Array.from(this.players.values()).filter(
      player => player.location === locationId
    );
  }
  
  // ========== 몬스터 관리 ==========
  
  /**
   * 몬스터 추가
   */
  addMonster(monster: Monster): void {
    this.monsters.set(monster.id, monster);
  }
  
  /**
   * 몬스터 조회
   */
  getMonster(monsterId: string): Monster | undefined {
    return this.monsters.get(monsterId);
  }
  
  /**
   * 몬스터 제거
   */
  removeMonster(monsterId: string): void {
    this.monsters.delete(monsterId);
  }
  
  /**
   * 특정 위치의 몬스터들 조회
   */
  getMonstersInLocation(locationId: string): Monster[] {
    return Array.from(this.monsters.values()).filter(
      monster => monster.location === locationId
    );
  }
  
  /**
   * 위치의 몬스터 수 조회
   */
  getMonsterCountInLocation(locationId: string): number {
    return this.getMonstersInLocation(locationId).length;
  }
  
  // ========== 아이템 관리 ==========
  
  /**
   * 아이템 추가
   */
  addItem(item: Item): void {
    this.items.set(item.id, item);
  }
  
  /**
   * 아이템 조회
   */
  getItem(itemId: string): Item | undefined {
    return this.items.get(itemId);
  }
  
  /**
   * 아이템 제거
   */
  removeItem(itemId: string): void {
    this.items.delete(itemId);
  }
  
  /**
   * 이름으로 아이템 검색
   */
  findItemByName(name: string): Item | undefined {
    return Array.from(this.items.values()).find(
      item => item.name.toLowerCase() === name.toLowerCase()
    );
  }
  
  // ========== 위치 관리 ==========
  
  /**
   * 위치 추가
   */
  addLocation(location: Location): void {
    this.locations.set(location.id, location);
  }
  
  /**
   * 위치 조회
   */
  getLocation(locationId: string): Location | undefined {
    return this.locations.get(locationId);
  }
  
  /**
   * 모든 위치 조회
   */
  getAllLocations(): Location[] {
    return Array.from(this.locations.values());
  }
  
  /**
   * 위치 초기화 (게임 시작 시 맵 데이터 로드)
   */
  initializeLocations(locations: Location[]): void {
    locations.forEach(location => {
      this.addLocation(location);
    });
  }
  
  // ========== 퀘스트 관리 ==========
  
  /**
   * 퀘스트 추가
   */
  addQuest(quest: Quest): void {
    this.quests.set(quest.id, quest);
  }
  
  /**
   * 퀘스트 조회
   */
  getQuest(questId: string): Quest | undefined {
    return this.quests.get(questId);
  }
  
  /**
   * 모든 퀘스트 조회
   */
  getAllQuests(): Quest[] {
    return Array.from(this.quests.values());
  }
  
  /**
   * 사용 가능한 퀘스트 조회
   */
  getAvailableQuests(): Quest[] {
    return Array.from(this.quests.values()).filter(
      quest => quest.status === 'available'
    );
  }
  
  /**
   * 퀘스트 초기화 (게임 시작 시 퀘스트 데이터 로드)
   */
  initializeQuests(quests: Quest[]): void {
    quests.forEach(quest => {
      this.addQuest(quest);
    });
  }
  
  // ========== 유틸리티 메서드 ==========
  
  /**
   * 고유 ID 생성
   */
  generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 게임 상태 초기화 (서버 재시작 시)
   */
  reset(): void {
    this.players.clear();
    this.monsters.clear();
    this.items.clear();
    // locations와 quests는 초기 데이터이므로 유지
  }
}

