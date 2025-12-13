/**
 * 맵 시스템
 * 지역 이동, 맵 생성, 위치 정보 관리를 담당합니다.
 */

import { Player, Location, MoveResult, LocationInfo, Item } from './types';
import { GameState } from './state';
import { LocationType } from './types';
import { createInitialItems, createMonsterTemplate, createInitialMonsters } from './initialData';
import { MonsterType } from './types';

export class MapSystem {
  private gameState: GameState;
  
  constructor(gameState: GameState) {
    this.gameState = gameState;
    this.initializeMap();
  }
  
  /**
   * 초기 맵 생성 (좌표 기반) - 확장된 맵 (약 50개 위치)
   */
  private initializeMap(): void {
    // 좌표 기반 맵 데이터 (x, y 좌표로 위치 정의)
    // 마을 중심부 (안전 지역)
    const locations: Omit<Location, 'exits'>[] = [
      // 마을 중심 (0, 0 주변)
      {
        id: 'town_square',
        name: '마을 광장',
        description: '평화로운 마을의 중심지입니다. 여러 상점과 여관이 보입니다.',
        x: 0,
        y: 0,
        exitDirections: {},
        monsters: [],
        items: [],
        npcs: ['quest_giver'],
        type: LocationType.TOWN
      },
      {
        id: 'east_shop',
        name: '상점',
        description: '다양한 아이템을 판매하는 상점입니다. 진열장에 여러 아이템들이 보입니다.',
        x: 1,
        y: 0,
        exitDirections: {},
        monsters: [],
        items: [],
        npcs: ['shopkeeper'],
        type: LocationType.TOWN
      },
      {
        id: 'west_inn',
        name: '여관',
        description: '휴식을 취할 수 있는 여관입니다. 따뜻한 불이 타오르고 편안한 분위기입니다.',
        x: -1,
        y: 0,
        exitDirections: {},
        monsters: [],
        items: [],
        npcs: ['innkeeper'],
        type: LocationType.TOWN
      },
      {
        id: 'north_town',
        name: '북쪽 마을',
        description: '마을의 북쪽 지역입니다. 평화롭고 안전한 분위기입니다.',
        x: 0,
        y: 1,
        exitDirections: {},
        monsters: [],
        items: [],
        npcs: [],
        type: LocationType.TOWN
      },
      {
        id: 'south_town',
        name: '남쪽 마을',
        description: '마을의 남쪽 지역입니다. 사람들이 오가는 활기찬 거리입니다.',
        x: 0,
        y: -1,
        exitDirections: {},
        monsters: [],
        items: [],
        npcs: [],
        type: LocationType.TOWN
      },
      
      // 북쪽 숲 지역 (레벨 1-2 몬스터)
      {
        id: 'north_forest_1',
        name: '북쪽 숲 입구',
        description: '위험한 몬스터들이 서식하는 어두운 숲의 입구입니다.',
        x: 0,
        y: 2,
        exitDirections: {},
        monsters: ['goblin_1', 'goblin_2'],
        items: ['health_potion_1'],
        npcs: [],
        type: LocationType.FOREST
      },
      {
        id: 'north_forest_2',
        name: '북쪽 숲 깊은 곳',
        description: '나무들이 빽빽하게 자라있고, 어둡고 으스스한 분위기가 감돕니다.',
        x: 0,
        y: 3,
        exitDirections: {},
        monsters: ['goblin_3', 'wolf_1'],
        items: [],
        npcs: [],
        type: LocationType.FOREST
      },
      {
        id: 'north_forest_3',
        name: '북쪽 숲 깊은 곳',
        description: '햇빛이 거의 들지 않는 어둡고 무서운 곳입니다.',
        x: 0,
        y: 4,
        exitDirections: {},
        monsters: ['wolf_2', 'goblin_4'],
        items: ['health_potion_2'],
        npcs: [],
        type: LocationType.FOREST
      },
      {
        id: 'north_forest_east_1',
        name: '북동쪽 숲',
        description: '동쪽으로 뻗어나간 숲 지역입니다.',
        x: 1,
        y: 2,
        exitDirections: {},
        monsters: ['goblin_5'],
        items: [],
        npcs: [],
        type: LocationType.FOREST
      },
      {
        id: 'north_forest_east_2',
        name: '북동쪽 숲 깊은 곳',
        description: '더욱 깊은 숲 속입니다.',
        x: 1,
        y: 3,
        exitDirections: {},
        monsters: ['wolf_3', 'goblin_6'],
        items: [],
        npcs: [],
        type: LocationType.FOREST
      },
      {
        id: 'north_forest_west_1',
        name: '북서쪽 숲',
        description: '서쪽으로 뻗어나간 숲 지역입니다.',
        x: -1,
        y: 2,
        exitDirections: {},
        monsters: ['goblin_7'],
        items: [],
        npcs: [],
        type: LocationType.FOREST
      },
      {
        id: 'north_forest_west_2',
        name: '북서쪽 숲 깊은 곳',
        description: '서쪽 숲의 깊은 곳입니다.',
        x: -1,
        y: 3,
        exitDirections: {},
        monsters: ['wolf_4', 'goblin_8'],
        items: [],
        npcs: [],
        type: LocationType.FOREST
      },
      
      // 동쪽 지역 (레벨 2-3 몬스터)
      {
        id: 'east_field_1',
        name: '동쪽 들판',
        description: '넓은 들판이 펼쳐져 있습니다. 가끔 몬스터들이 나타납니다.',
        x: 2,
        y: 0,
        exitDirections: {},
        monsters: ['wolf_5', 'goblin_9'],
        items: [],
        npcs: [],
        type: LocationType.FIELD
      },
      {
        id: 'east_field_2',
        name: '동쪽 들판 깊은 곳',
        description: '더욱 넓은 들판입니다.',
        x: 3,
        y: 0,
        exitDirections: {},
        monsters: ['wolf_6', 'orc_1'],
        items: [],
        npcs: [],
        type: LocationType.FIELD
      },
      {
        id: 'east_field_3',
        name: '동쪽 들판 끝',
        description: '들판의 끝자락입니다.',
        x: 4,
        y: 0,
        exitDirections: {},
        monsters: ['orc_2', 'wolf_7'],
        items: ['health_potion_1'],
        npcs: [],
        type: LocationType.FIELD
      },
      {
        id: 'east_forest_1',
        name: '동쪽 숲',
        description: '동쪽에 위치한 숲입니다.',
        x: 2,
        y: 1,
        exitDirections: {},
        monsters: ['wolf_8', 'goblin_10'],
        items: [],
        npcs: [],
        type: LocationType.FOREST
      },
      {
        id: 'east_forest_2',
        name: '동쪽 숲 깊은 곳',
        description: '동쪽 숲의 깊은 곳입니다.',
        x: 3,
        y: 1,
        exitDirections: {},
        monsters: ['orc_3', 'wolf_9'],
        items: [],
        npcs: [],
        type: LocationType.FOREST
      },
      
      // 서쪽 지역 (레벨 2-3 몬스터)
      {
        id: 'west_field_1',
        name: '서쪽 들판',
        description: '서쪽에 펼쳐진 넓은 들판입니다.',
        x: -2,
        y: 0,
        exitDirections: {},
        monsters: ['wolf_10', 'goblin_11'],
        items: [],
        npcs: [],
        type: LocationType.FIELD
      },
      {
        id: 'west_field_2',
        name: '서쪽 들판 깊은 곳',
        description: '서쪽 들판의 깊은 곳입니다.',
        x: -3,
        y: 0,
        exitDirections: {},
        monsters: ['orc_4', 'wolf_11'],
        items: [],
        npcs: [],
        type: LocationType.FIELD
      },
      {
        id: 'west_forest_1',
        name: '서쪽 숲',
        description: '서쪽에 위치한 숲입니다.',
        x: -2,
        y: 1,
        exitDirections: {},
        monsters: ['wolf_12', 'goblin_12'],
        items: [],
        npcs: [],
        type: LocationType.FOREST
      },
      {
        id: 'west_forest_2',
        name: '서쪽 숲 깊은 곳',
        description: '서쪽 숲의 깊은 곳입니다.',
        x: -3,
        y: 1,
        exitDirections: {},
        monsters: ['orc_5', 'wolf_13'],
        items: [],
        npcs: [],
        type: LocationType.FOREST
      },
      
      // 남쪽 지역 (레벨 1-2 몬스터)
      {
        id: 'south_field_1',
        name: '남쪽 들판',
        description: '남쪽에 펼쳐진 들판입니다.',
        x: 0,
        y: -2,
        exitDirections: {},
        monsters: ['goblin_13', 'goblin_14'],
        items: [],
        npcs: [],
        type: LocationType.FIELD
      },
      {
        id: 'south_field_2',
        name: '남쪽 들판 깊은 곳',
        description: '남쪽 들판의 깊은 곳입니다.',
        x: 0,
        y: -3,
        exitDirections: {},
        monsters: ['wolf_14', 'goblin_15'],
        items: [],
        npcs: [],
        type: LocationType.FIELD
      },
      {
        id: 'south_forest_1',
        name: '남쪽 숲',
        description: '남쪽에 위치한 숲입니다.',
        x: 1,
        y: -2,
        exitDirections: {},
        monsters: ['goblin_16', 'wolf_15'],
        items: [],
        npcs: [],
        type: LocationType.FOREST
      },
      {
        id: 'south_forest_2',
        name: '남쪽 숲 깊은 곳',
        description: '남쪽 숲의 깊은 곳입니다.',
        x: 1,
        y: -3,
        exitDirections: {},
        monsters: ['wolf_16', 'goblin_17'],
        items: [],
        npcs: [],
        type: LocationType.FOREST
      },
      {
        id: 'south_west_forest_1',
        name: '남서쪽 숲',
        description: '남서쪽에 위치한 숲입니다.',
        x: -1,
        y: -2,
        exitDirections: {},
        monsters: ['goblin_18', 'wolf_17'],
        items: [],
        npcs: [],
        type: LocationType.FOREST
      },
      
      // 북동쪽 확장 지역 (레벨 3-4 몬스터)
      {
        id: 'northeast_field_1',
        name: '북동쪽 들판',
        description: '북동쪽에 펼쳐진 넓은 들판입니다.',
        x: 2,
        y: 2,
        exitDirections: {},
        monsters: ['orc_6', 'wolf_18'],
        items: [],
        npcs: [],
        type: LocationType.FIELD
      },
      {
        id: 'northeast_field_2',
        name: '북동쪽 들판 깊은 곳',
        description: '북동쪽 들판의 깊은 곳입니다.',
        x: 3,
        y: 2,
        exitDirections: {},
        monsters: ['orc_7', 'orc_8'],
        items: [],
        npcs: [],
        type: LocationType.FIELD
      },
      {
        id: 'northeast_forest_1',
        name: '북동쪽 숲',
        description: '북동쪽에 위치한 위험한 숲입니다.',
        x: 2,
        y: 3,
        exitDirections: {},
        monsters: ['orc_9', 'wolf_19'],
        items: [],
        npcs: [],
        type: LocationType.FOREST
      },
      {
        id: 'northeast_forest_2',
        name: '북동쪽 숲 깊은 곳',
        description: '북동쪽 숲의 매우 위험한 깊은 곳입니다.',
        x: 3,
        y: 3,
        exitDirections: {},
        monsters: ['orc_10', 'orc_11'],
        items: ['health_potion_2'],
        npcs: [],
        type: LocationType.FOREST
      },
      
      // 북서쪽 확장 지역 (레벨 3-4 몬스터)
      {
        id: 'northwest_field_1',
        name: '북서쪽 들판',
        description: '북서쪽에 펼쳐진 넓은 들판입니다.',
        x: -2,
        y: 2,
        exitDirections: {},
        monsters: ['orc_12', 'wolf_20'],
        items: [],
        npcs: [],
        type: LocationType.FIELD
      },
      {
        id: 'northwest_field_2',
        name: '북서쪽 들판 깊은 곳',
        description: '북서쪽 들판의 깊은 곳입니다.',
        x: -3,
        y: 2,
        exitDirections: {},
        monsters: ['orc_13', 'orc_14'],
        items: [],
        npcs: [],
        type: LocationType.FIELD
      },
      {
        id: 'northwest_forest_1',
        name: '북서쪽 숲',
        description: '북서쪽에 위치한 위험한 숲입니다.',
        x: -2,
        y: 3,
        exitDirections: {},
        monsters: ['orc_15', 'wolf_21'],
        items: [],
        npcs: [],
        type: LocationType.FOREST
      },
      {
        id: 'northwest_forest_2',
        name: '북서쪽 숲 깊은 곳',
        description: '북서쪽 숲의 매우 위험한 깊은 곳입니다.',
        x: -3,
        y: 3,
        exitDirections: {},
        monsters: ['orc_16', 'orc_17'],
        items: ['health_potion_2'],
        npcs: [],
        type: LocationType.FOREST
      },
      
      // 남동쪽 확장 지역 (레벨 2-3 몬스터)
      {
        id: 'southeast_field_1',
        name: '남동쪽 들판',
        description: '남동쪽에 펼쳐진 들판입니다.',
        x: 2,
        y: -2,
        exitDirections: {},
        monsters: ['wolf_22', 'goblin_19'],
        items: [],
        npcs: [],
        type: LocationType.FIELD
      },
      {
        id: 'southeast_field_2',
        name: '남동쪽 들판 깊은 곳',
        description: '남동쪽 들판의 깊은 곳입니다.',
        x: 3,
        y: -2,
        exitDirections: {},
        monsters: ['orc_18', 'wolf_23'],
        items: [],
        npcs: [],
        type: LocationType.FIELD
      },
      {
        id: 'southeast_forest_1',
        name: '남동쪽 숲',
        description: '남동쪽에 위치한 숲입니다.',
        x: 2,
        y: -3,
        exitDirections: {},
        monsters: ['wolf_24', 'goblin_20'],
        items: [],
        npcs: [],
        type: LocationType.FOREST
      },
      
      // 남서쪽 확장 지역 (레벨 2-3 몬스터)
      {
        id: 'southwest_field_1',
        name: '남서쪽 들판',
        description: '남서쪽에 펼쳐진 들판입니다.',
        x: -2,
        y: -2,
        exitDirections: {},
        monsters: ['wolf_25', 'goblin_21'],
        items: [],
        npcs: [],
        type: LocationType.FIELD
      },
      {
        id: 'southwest_field_2',
        name: '남서쪽 들판 깊은 곳',
        description: '남서쪽 들판의 깊은 곳입니다.',
        x: -3,
        y: -2,
        exitDirections: {},
        monsters: ['orc_19', 'wolf_26'],
        items: [],
        npcs: [],
        type: LocationType.FIELD
      },
      {
        id: 'southwest_forest_1',
        name: '남서쪽 숲',
        description: '남서쪽에 위치한 숲입니다.',
        x: -2,
        y: -3,
        exitDirections: {},
        monsters: ['wolf_27', 'goblin_22'],
        items: [],
        npcs: [],
        type: LocationType.FOREST
      },
      
      // 극단 지역 (레벨 4-5 몬스터)
      {
        id: 'extreme_north',
        name: '극북 지역',
        description: '매우 위험한 극북 지역입니다. 강력한 몬스터들이 서식합니다.',
        x: 0,
        y: 5,
        exitDirections: {},
        monsters: ['orc_20', 'orc_21', 'orc_22'],
        items: ['health_potion_2'],
        npcs: [],
        type: LocationType.DUNGEON
      },
      {
        id: 'extreme_east',
        name: '극동 지역',
        description: '매우 위험한 극동 지역입니다.',
        x: 5,
        y: 0,
        exitDirections: {},
        monsters: ['orc_23', 'orc_24'],
        items: [],
        npcs: [],
        type: LocationType.DUNGEON
      },
      {
        id: 'extreme_west',
        name: '극서 지역',
        description: '매우 위험한 극서 지역입니다.',
        x: -4,
        y: 0,
        exitDirections: {},
        monsters: ['orc_25', 'orc_26'],
        items: [],
        npcs: [],
        type: LocationType.DUNGEON
      },
      {
        id: 'extreme_south',
        name: '극남 지역',
        description: '매우 위험한 극남 지역입니다.',
        x: 0,
        y: -4,
        exitDirections: {},
        monsters: ['orc_27', 'orc_28'],
        items: [],
        npcs: [],
        type: LocationType.DUNGEON
      }
    ];
    
    // 좌표 기반으로 exits 자동 계산
    const locationsWithExits: Location[] = locations.map(loc => {
      const exits: string[] = [];
      const exitDirections: { [direction: string]: string } = { ...loc.exitDirections };
      
      // 동서남북 방향 자동 계산
      // 북쪽 (y+1)
      const northLoc = locations.find(l => l.x === loc.x && l.y === loc.y + 1);
      if (northLoc) {
        exits.push(northLoc.id);
        exitDirections['north'] = northLoc.id;
      }
      
      // 남쪽 (y-1)
      const southLoc = locations.find(l => l.x === loc.x && l.y === loc.y - 1);
      if (southLoc) {
        exits.push(southLoc.id);
        exitDirections['south'] = southLoc.id;
      }
      
      // 동쪽 (x+1)
      const eastLoc = locations.find(l => l.x === loc.x + 1 && l.y === loc.y);
      if (eastLoc) {
        exits.push(eastLoc.id);
        exitDirections['east'] = eastLoc.id;
      }
      
      // 서쪽 (x-1)
      const westLoc = locations.find(l => l.x === loc.x - 1 && l.y === loc.y);
      if (westLoc) {
        exits.push(westLoc.id);
        exitDirections['west'] = westLoc.id;
      }
      
      return {
        ...loc,
        exits,
        exitDirections
      };
    });
    
    // 위치 초기화
    this.gameState.initializeLocations(locationsWithExits);
    
    // 초기 아이템 생성 및 배치
    const initialItems = createInitialItems();
    initialItems.forEach(item => {
      this.gameState.addItem(item);
    });
    
    // 몬스터 생성 및 배치
    this.spawnMonstersForLocations(locationsWithExits);
  }
  
  /**
   * 각 위치에 몬스터 스폰
   */
  private spawnMonstersForLocations(locations: Location[]): void {
    locations.forEach(location => {
      if (location.monsters && location.monsters.length > 0) {
        location.monsters.forEach(monsterId => {
          // 몬스터 레벨 결정 (위치 타입과 거리에 따라)
          let level = 1;
          const distance = Math.abs(location.x) + Math.abs(location.y);
          
          if (location.type === LocationType.DUNGEON) {
            level = 4 + Math.floor(distance / 2);
          } else if (location.type === LocationType.FOREST) {
            level = 1 + Math.floor(distance / 2);
          } else if (location.type === LocationType.FIELD) {
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
          
          // 몬스터 생성
          const monster = createMonsterTemplate(
            monsterId,
            monsterName,
            monsterType,
            level,
            location.id
          );
          
          this.gameState.addMonster(monster);
        });
      }
    });
  }
  
  /**
   * 플레이어 이동
   */
  movePlayer(playerId: string, direction: string): MoveResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    // 전투 중에는 이동 불가
    if (player.inCombat) {
      return {
        success: false,
        message: '전투 중에는 이동할 수 없습니다.'
      };
    }
    
    const currentLocation = this.gameState.getLocation(player.location);
    if (!currentLocation) {
      return {
        success: false,
        message: '현재 위치를 찾을 수 없습니다.'
      };
    }
    
    // 방향에 따른 출구 찾기 (좌표 기반)
    let targetLocationId: string | undefined;
    
    // 특수 출구 (위/아래, 비밀문 등)는 exitDirections에서 먼저 확인
    if (currentLocation.exitDirections && currentLocation.exitDirections[direction]) {
      targetLocationId = currentLocation.exitDirections[direction];
    } else {
      // 동서남북은 좌표 기반으로 자동 계산
      let targetX = currentLocation.x;
      let targetY = currentLocation.y;
      
      switch (direction) {
        case 'north':
          targetY += 1;
          break;
        case 'south':
          targetY -= 1;
          break;
        case 'east':
          targetX += 1;
          break;
        case 'west':
          targetX -= 1;
          break;
        default:
          // 위/아래는 exitDirections에 있어야 함
          break;
      }
      
      // 해당 좌표의 위치 찾기
      if (direction === 'north' || direction === 'south' || direction === 'east' || direction === 'west') {
        const allLocations = this.gameState.getAllLocations();
        const targetLocation = allLocations.find(loc => loc.x === targetX && loc.y === targetY);
        if (targetLocation) {
          targetLocationId = targetLocation.id;
        }
      }
    }
    
    if (!targetLocationId) {
      // 이동 가능한 방향 안내
      let availableDirections = '';
      if (currentLocation.exitDirections && Object.keys(currentLocation.exitDirections).length > 0) {
        const directionNames: { [key: string]: string } = {
          'north': '북',
          'south': '남',
          'east': '동',
          'west': '서',
          'up': '위',
          'down': '아래'
        };
        const available = Object.keys(currentLocation.exitDirections)
          .map(dir => directionNames[dir] || dir)
          .join(', ');
        availableDirections = `\n이동 가능한 방향: ${available}`;
      }
      
      return {
        success: false,
        message: `${direction} 방향으로 갈 수 있는 길이 없습니다.${availableDirections}`
      };
    }
    
    const targetLocation = this.gameState.getLocation(targetLocationId);
    if (!targetLocation) {
      return {
        success: false,
        message: '목적지 위치를 찾을 수 없습니다.'
      };
    }
    
    // 위치 업데이트
    player.location = targetLocationId;
    
    // 방문한 지역 목록에 추가 (중복 제거)
    if (!player.visitedLocations) {
      player.visitedLocations = [];
    }
    if (!player.visitedLocations.includes(targetLocationId)) {
      player.visitedLocations.push(targetLocationId);
    }
    
    this.gameState.updatePlayer(playerId, player);
    
    return {
      success: true,
      message: `${targetLocation.name}에 도착했습니다.`,
      data: { location: targetLocation },
      newLocation: targetLocation
    };
  }
  
  /**
   * 위치 정보 조회
   */
  getLocationInfo(locationId: string): LocationInfo | null {
    const location = this.gameState.getLocation(locationId);
    if (!location) {
      return null;
    }
    
    const players = this.gameState.getPlayersInLocation(locationId);
    const monsters = this.gameState.getMonstersInLocation(locationId);
    const items = location.items
      .map(itemId => this.gameState.getItem(itemId))
      .filter((item): item is typeof item & Item => item !== undefined);
    
    return {
      location,
      players,
      monsters,
      items
    };
  }
  
  /**
   * 시작 위치 반환 (새 플레이어용)
   */
  getStartLocation(): Location | null {
    return this.gameState.getLocation('town_square') ?? null;
  }
  
  /**
   * 지도 보기 (현재 위치 주변 맵 생성)
   */
  getMapView(playerId: string): MoveResult {
    const player = this.gameState.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        message: '플레이어를 찾을 수 없습니다.'
      };
    }
    
    const currentLocation = this.gameState.getLocation(player.location);
    if (!currentLocation) {
      return {
        success: false,
        message: '현재 위치를 찾을 수 없습니다.'
      };
    }
    
    // 주변 맵 생성 (5x5 그리드, 현재 위치 중심)
    const mapSize = 5;
    const centerX = currentLocation.x;
    const centerY = currentLocation.y;
    const startX = centerX - Math.floor(mapSize / 2);
    const startY = centerY - Math.floor(mapSize / 2);
    
    let mapText = `\n${'='.repeat(60)}\n`;
    mapText += `지도 (현재 위치: ${currentLocation.name})\n`;
    mapText += `${'='.repeat(60)}\n\n`;
    
    // Y축 역순으로 출력 (맨 위가 북쪽)
    for (let y = startY + mapSize - 1; y >= startY; y--) {
      let row = '';
      
      for (let x = startX; x < startX + mapSize; x++) {
        const location = this.gameState.getAllLocations().find(
          loc => loc.x === x && loc.y === y
        );
        
        if (location) {
          const isCurrent = location.id === currentLocation.id;
          const isVisited = player.visitedLocations && player.visitedLocations.includes(location.id);
          
          // 지역 타입에 따른 표시
          let symbol = '';
          switch (location.type) {
            case 'town':
              symbol = isCurrent ? '[★]' : '[마]';
              break;
            case 'forest':
              symbol = isCurrent ? '[★]' : '[숲]';
              break;
            case 'field':
              symbol = isCurrent ? '[★]' : '[들]';
              break;
            case 'dungeon':
              symbol = isCurrent ? '[★]' : '[던]';
              break;
            default:
              symbol = isCurrent ? '[★]' : '[?]';
          }
          
          if (!isVisited && !isCurrent) {
            symbol = '[?]'; // 미탐험 지역
          }
          
          row += symbol;
        } else {
          row += '   '; // 빈 공간
        }
        
        row += ' ';
      }
      
      mapText += row + '\n';
    }
    
    mapText += `\n[범례]\n`;
    mapText += `★ = 현재 위치\n`;
    mapText += `[마] = 마을, [숲] = 숲, [들] = 들판, [던] = 던전\n`;
    mapText += `[?] = 미탐험 지역\n`;
    mapText += `\n${'='.repeat(60)}\n`;
    
    return {
      success: true,
      message: mapText.trim(),
      data: { mapView: mapText }
    };
  }
}

