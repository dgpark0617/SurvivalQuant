/**
 * 게임 데이터 타입 정의
 * 모든 게임 엔티티의 TypeScript 타입을 정의합니다.
 */

// 아이템 타입 열거형
export enum ItemType {
  WEAPON = 'weapon',           // 무기
  ARMOR = 'armor',             // 방어구
  CONSUMABLE = 'consumable',    // 소비 아이템
  QUEST = 'quest',             // 퀘스트 아이템
  MISC = 'misc'                // 기타
}

// 몬스터 타입 열거형
export enum MonsterType {
  GOBLIN = 'goblin',
  WOLF = 'wolf',
  ORC = 'orc',
  DRAGON = 'dragon',
  SLIME = 'slime'
}

// 위치 타입 열거형
export enum LocationType {
  TOWN = 'town',               // 마을
  DUNGEON = 'dungeon',         // 던전
  FOREST = 'forest',           // 숲
  FIELD = 'field'              // 평야
}

// 스킬 타입 열거형
export enum SkillType {
  NORMAL_ATTACK = 'normal_attack',  // 일반 공격
  POWER_STRIKE = 'power_strike',   // 강타
  DODGE = 'dodge',                  // 회피
  HEAL = 'heal'                     // 회복
}

// 스킬 인터페이스
export interface Skill {
  id: string;                   // 스킬 ID
  name: string;                 // 스킬 이름
  type: SkillType;              // 스킬 타입
  description: string;          // 스킬 설명
  mpCost: number;              // MP 소모량
  cooldown: number;            // 쿨다운 (틱 단위)
  damageMultiplier?: number;    // 데미지 배율 (공격 스킬)
  effect?: string;              // 효과 설명
}

// NPC 타입 열거형
export enum NPCType {
  QUEST_GIVER = 'quest_giver',  // 퀘스트 제공자
  SHOPKEEPER = 'shopkeeper',    // 상점 주인
  INNKEEPER = 'innkeeper',      // 여관 주인
  INFO = 'info',                // 정보 제공자
  GUARD = 'guard'              // 경비병
}

// NPC 인터페이스
export interface NPC {
  id: string;                   // NPC ID
  name: string;                 // NPC 이름
  type: NPCType;                // NPC 타입
  description: string;           // NPC 설명
  dialogue: string[];           // 대화 내용 배열
  location: string;             // NPC가 있는 위치 ID
  quests?: string[];            // 제공하는 퀘스트 ID 목록
  shopItems?: string[];         // 판매하는 아이템 ID 목록 (상점 NPC)
  healCost?: number;            // 회복 비용 (여관 NPC)
}

// 퀘스트 타입 열거형
export enum QuestType {
  KILL = 'kill',               // 몬스터 처치
  COLLECT = 'collect',         // 아이템 수집
  EXPLORE = 'explore',         // 지역 탐험
  TALK = 'talk'                // NPC 대화
}

// 퀘스트 상태 열거형
export enum QuestStatus {
  AVAILABLE = 'available',      // 수락 가능
  IN_PROGRESS = 'in_progress', // 진행 중
  COMPLETED = 'completed'      // 완료
}

// 아이템 효과 인터페이스
export interface ItemEffect {
  type: 'hp' | 'mp' | 'attack' | 'defense';  // 효과 타입
  value: number;                              // 효과 값
}

// 드롭 아이템 인터페이스
export interface DropItem {
  itemId: string;              // 아이템 ID
  dropRate: number;            // 드롭 확률 (0.0 ~ 1.0)
}

// 아이템 인터페이스
export interface Item {
  id: string;                   // 고유 ID
  name: string;                 // 아이템 이름
  type: ItemType;                // 아이템 타입
  description: string;           // 설명
  value: number;                 // 가치 (판매/구매 가격)
  effects?: ItemEffect[];        // 효과 (HP 회복, 스탯 증가 등)
  stackable: boolean;            // 중첩 가능 여부
  quantity?: number;             // 수량 (stackable일 경우)
}

// 몬스터 인터페이스
export interface Monster {
  id: string;                    // 고유 ID
  name: string;                  // 몬스터 이름
  type: MonsterType;             // 몬스터 타입
  level: number;                 // 레벨
  hp: number;                    // 현재 HP
  maxHp: number;                 // 최대 HP
  attack: number;                // 공격력
  defense: number;               // 방어력
  expReward: number;             // 경험치 보상
  goldReward: number;            // 골드 보상
  dropItems: DropItem[];         // 드롭 아이템 목록
  location: string;              // 출현 위치
  spawnTime: Date;               // 생성 시간
}

// 위치 인터페이스
export interface Location {
  id: string;                    // 위치 ID
  name: string;                  // 위치 이름
  description: string;           // 위치 설명
  x: number;                     // X 좌표 (격자 맵)
  y: number;                     // Y 좌표 (격자 맵)
  exits: string[];               // 연결된 위치 ID 목록 (자동 계산됨)
  exitDirections?: { [direction: string]: string }; // 특수 출구 (위/아래, 비밀문 등) - 수동 설정
  monsters: string[];            // 출현 몬스터 ID 목록
  items: string[];               // 배치된 아이템 ID 목록
  npcs: string[];                 // NPC ID 목록
  type: LocationType;             // 위치 타입
}

// 퀘스트 목표 인터페이스
export interface QuestObjective {
  type: 'kill' | 'collect' | 'explore' | 'talk';  // 목표 타입
  target: string;                                 // 목표 대상
  current: number;                                // 현재 진행도
  required: number;                               // 필요 수량
}

// 퀘스트 보상 인터페이스
export interface QuestReward {
  exp: number;                   // 경험치 보상
  gold: number;                  // 골드 보상
  items?: string[];              // 아이템 보상 ID 목록
}

// 퀘스트 인터페이스
export interface Quest {
  id: string;                     // 퀘스트 ID
  title: string;                  // 퀘스트 제목
  description: string;           // 퀘스트 설명
  type: QuestType;                // 퀘스트 타입
  objectives: QuestObjective[];  // 목표 목록
  rewards: QuestReward;           // 보상
  status: QuestStatus;            // 퀘스트 상태
}

// 플레이어 인터페이스
export interface Player {
  id: string;                     // Socket ID
  name: string;                   // 플레이어 이름
  level: number;                  // 레벨
  exp: number;                    // 현재 경험치
  expToNext: number;              // 다음 레벨까지 필요한 경험치
  hp: number;                     // 현재 HP
  maxHp: number;                  // 최대 HP
  mp: number;                     // 현재 MP
  maxMp: number;                  // 최대 MP
  attack: number;                 // 공격력
  defense: number;                // 방어력
  location: string;               // 현재 위치 ID
  inventory: Item[];              // 인벤토리 (최대 20개)
  gold: number;                   // 골드
  activeQuests: string[];         // 진행 중인 퀘스트 ID 목록
  completedQuests: string[];      // 완료한 퀘스트 ID 목록
  inCombat: boolean;              // 전투 중 여부
  combatTarget?: string;          // 전투 대상 몬스터 ID
  visitedLocations: string[];     // 방문한 위치 ID 목록
  createdAt: Date;                // 생성 시간
  lastActive: Date;               // 마지막 활동 시간
}

// 게임 액션 열거형
export enum GameAction {
  MOVE = 'move',
  ATTACK = 'attack',
  FLEE = 'flee',
  FIGHT = 'fight',
  INVENTORY = 'inventory',
  GET_ITEM = 'get_item',
  USE_ITEM = 'use_item',
  DROP_ITEM = 'drop_item',
  STATUS = 'status',
  LOOK = 'look',
  HELP = 'help',
  QUEST = 'quest',
  QUEST_ACCEPT = 'quest_accept',
  TALK = 'talk',                 // NPC 대화
  SHOP = 'shop',                 // 상점 열기
  BUY = 'buy',                   // 아이템 구매
  SELL = 'sell',                 // 아이템 판매
  HEAL = 'heal',                 // 회복 (여관)
  LOOK_AT = 'look_at',           // NPC/몬스터 관찰
  MAP = 'map',                   // 지도 보기
  SKILL = 'skill',               // 스킬 사용
  CHAT = 'chat',                 // 일반 채팅
  UNKNOWN = 'unknown'
}

// 파싱된 명령어 인터페이스
export interface ParsedCommand {
  action: GameAction;
  args: string[];
  original: string;
}

// 게임 결과 인터페이스
export interface GameResult {
  success: boolean;
  message: string;
  data?: any;
  broadcast?: boolean;            // 다른 플레이어에게도 브로드캐스트할지 여부
}

// 전투 결과 인터페이스
export interface CombatResult extends GameResult {
  playerHp?: number;
  monsterHp?: number;
  damage?: number;
  monsterDefeated?: boolean;
  playerDefeated?: boolean;
}

// 레벨업 결과 인터페이스
export interface LevelResult extends GameResult {
  newLevel?: number;
  statIncreases?: {
    hp?: number;
    mp?: number;
    attack?: number;
    defense?: number;
  };
}

// 이동 결과 인터페이스
export interface MoveResult extends GameResult {
  newLocation?: Location;
}

// 퀘스트 결과 인터페이스
export interface QuestResult extends GameResult {
  questId?: string;
  progress?: QuestObjective[];
}

// 위치 정보 인터페이스
export interface LocationInfo {
  location: Location;
  players: Player[];
  monsters: Monster[];
  items: Item[];
}

