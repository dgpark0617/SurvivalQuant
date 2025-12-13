/**
 * 게임 설정값
 * 게임 밸런스 및 기본 설정을 관리합니다.
 */

export const GAME_CONFIG = {
  // 플레이어 초기값
  PLAYER: {
    INITIAL_LEVEL: 1,
    INITIAL_HP: 100,
    INITIAL_MP: 50,
    INITIAL_ATTACK: 10,
    INITIAL_DEFENSE: 5,
    INITIAL_GOLD: 0,
    MAX_INVENTORY: 20
  },
  
  // 전투 설정
  COMBAT: {
    FLEE_SUCCESS_RATE: 0.5,        // 도망 성공률 (50%)
    DAMAGE_VARIANCE: 0.2,          // ±20% 데미지 변동
    MIN_DAMAGE: 1                  // 최소 데미지
  },
  
  // 레벨업 설정
  LEVEL: {
    EXP_MULTIPLIER: 100,           // 레벨 × 100 = 다음 레벨 경험치
    HP_PER_LEVEL: 20,              // 레벨업당 HP 증가
    MP_PER_LEVEL: 10,              // 레벨업당 MP 증가
    ATTACK_PER_LEVEL: 3,           // 레벨업당 공격력 증가
    DEFENSE_PER_LEVEL: 2           // 레벨업당 방어력 증가
  },
  
  // 몬스터 스폰 설정
  MONSTER: {
    SPAWN_INTERVAL: 30000,         // 30초마다 스폰
    MAX_PER_LOCATION: 5,           // 위치당 최대 몬스터 수
    SPAWN_CHANCE: 0.3              // 스폰 확률 (30%)
  },
  
  // 플레이어 스탯 계산식
  STATS: {
    // 플레이어 기본 공격력: 레벨 × 5
    PLAYER_ATTACK: (level: number) => level * 5,
    // 플레이어 기본 방어력: 레벨 × 3
    PLAYER_DEFENSE: (level: number) => level * 3,
    // 몬스터 공격력: 레벨 × 4 ~ 레벨 × 6
    MONSTER_ATTACK_MIN: (level: number) => level * 4,
    MONSTER_ATTACK_MAX: (level: number) => level * 6,
    // 몬스터 방어력: 레벨 × 2 ~ 레벨 × 4
    MONSTER_DEFENSE_MIN: (level: number) => level * 2,
    MONSTER_DEFENSE_MAX: (level: number) => level * 4
  }
};

