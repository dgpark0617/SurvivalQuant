/**
 * 초기 게임 데이터
 * 게임 시작 시 필요한 기본 아이템, 몬스터 데이터를 정의합니다.
 */

import { Item, Monster, ItemType, MonsterType } from './types';
import { GAME_CONFIG } from './config';

/**
 * 초기 아이템 데이터 생성
 */
export function createInitialItems(): Item[] {
  return [
    {
      id: 'health_potion_1',
      name: '체력 포션',
      type: ItemType.CONSUMABLE,
      description: 'HP를 50 회복합니다.',
      value: 10,
      effects: [
        { type: 'hp', value: 50 }
      ],
      stackable: true,
      quantity: 1
    },
    {
      id: 'health_potion_2',
      name: '체력 포션',
      type: ItemType.CONSUMABLE,
      description: 'HP를 50 회복합니다.',
      value: 10,
      effects: [
        { type: 'hp', value: 50 }
      ],
      stackable: true,
      quantity: 1
    },
    {
      id: 'iron_sword',
      name: '철검',
      type: ItemType.WEAPON,
      description: '공격력이 5 증가합니다.',
      value: 50,
      effects: [
        { type: 'attack', value: 5 }
      ],
      stackable: false
    }
  ];
}

/**
 * 몬스터 템플릿 생성
 */
export function createMonsterTemplate(
  id: string,
  name: string,
  type: MonsterType,
  level: number,
  location: string
): Monster {
  const attackMin = GAME_CONFIG.STATS.MONSTER_ATTACK_MIN(level);
  const attackMax = GAME_CONFIG.STATS.MONSTER_ATTACK_MAX(level);
  const defenseMin = GAME_CONFIG.STATS.MONSTER_DEFENSE_MIN(level);
  const defenseMax = GAME_CONFIG.STATS.MONSTER_DEFENSE_MAX(level);
  
  const attack = Math.floor(Math.random() * (attackMax - attackMin + 1)) + attackMin;
  const defense = Math.floor(Math.random() * (defenseMax - defenseMin + 1)) + defenseMin;
  const maxHp = level * 30;
  
  return {
    id,
    name,
    type,
    level,
    hp: maxHp,
    maxHp,
    attack,
    defense,
    expReward: level * 20,
    goldReward: level * 5,
    dropItems: [],
    location,
    spawnTime: new Date()
  };
}

/**
 * 초기 몬스터 생성 (위치별)
 */
export function createInitialMonsters(): Monster[] {
  return [
    createMonsterTemplate('goblin_1', '고블린', MonsterType.GOBLIN, 1, 'north_forest'),
    createMonsterTemplate('goblin_2', '고블린', MonsterType.GOBLIN, 1, 'north_forest'),
    createMonsterTemplate('wolf_1', '늑대', MonsterType.WOLF, 2, 'forest_deep'),
    createMonsterTemplate('orc_1', '오크', MonsterType.ORC, 3, 'forest_deep')
  ];
}

