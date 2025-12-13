/**
 * 게임 명령어 파서
 * 채팅 입력을 게임 액션으로 변환합니다.
 * 한글 명령어만 지원합니다.
 */

import { ParsedCommand, GameAction } from './types';

/**
 * 명령어를 파싱하여 게임 액션으로 변환
 */
function parseCommand(input: string): ParsedCommand {
  // 입력 정규화 (공백 정리만, 한글은 대소문자 구분 없음)
  const normalized = input.trim();
  const parts = normalized.split(/\s+/);
  
  if (parts.length === 0) {
    return {
      action: GameAction.UNKNOWN,
      args: [],
      original: input
    };
  }
  
  const command = parts[0];
  const args = parts.slice(1);
  
  // 이동 명령어
  if (isMoveCommand(command)) {
    if (args.length > 0) {
      const direction = parseDirection(args[0]);
      if (direction) {
        return {
          action: GameAction.MOVE,
          args: [direction],
          original: input
        };
      }
    }
    return {
      action: GameAction.MOVE,
      args: [],
      original: input
    };
  }
  
  // 전투 명령어
  if (isAttackCommand(command)) {
    return {
      action: GameAction.ATTACK,
      args: [],
      original: input
    };
  }
  
  if (isFleeCommand(command)) {
    return {
      action: GameAction.FLEE,
      args: [],
      original: input
    };
  }
  
  if (isFightCommand(command)) {
    return {
      action: GameAction.FIGHT,
      args: args,
      original: input
    };
  }
  
  // 인벤토리 명령어
  if (isInventoryCommand(command)) {
    return {
      action: GameAction.INVENTORY,
      args: [],
      original: input
    };
  }
  
  if (isGetItemCommand(command)) {
    return {
      action: GameAction.GET_ITEM,
      args: args,
      original: input
    };
  }
  
  if (isUseItemCommand(command)) {
    return {
      action: GameAction.USE_ITEM,
      args: args,
      original: input
    };
  }
  
  if (isDropItemCommand(command)) {
    return {
      action: GameAction.DROP_ITEM,
      args: args,
      original: input
    };
  }
  
  // 정보 명령어
  if (isStatusCommand(command)) {
    return {
      action: GameAction.STATUS,
      args: [],
      original: input
    };
  }
  
  // 관찰 명령어 (주변 명령어보다 먼저 체크)
  if (isLookAtCommand(command)) {
    return {
      action: GameAction.LOOK_AT,
      args: args,
      original: input
    };
  }
  
  if (isLookCommand(command)) {
    return {
      action: GameAction.LOOK,
      args: [],
      original: input
    };
  }
  
  if (isHelpCommand(command)) {
    return {
      action: GameAction.HELP,
      args: [],
      original: input
    };
  }
  
  // 퀘스트 명령어
  if (isQuestCommand(command)) {
    if (args.length >= 2 && args[0] === '수락') {
      return {
        action: GameAction.QUEST_ACCEPT,
        args: args.slice(1),
        original: input
      };
    }
    return {
      action: GameAction.QUEST,
      args: [],
      original: input
    };
  }
  
  // NPC 상호작용 명령어
  if (isTalkCommand(command)) {
    return {
      action: GameAction.TALK,
      args: args,
      original: input
    };
  }
  
  if (isShopCommand(command)) {
    return {
      action: GameAction.SHOP,
      args: args,
      original: input
    };
  }
  
  if (isBuyCommand(command)) {
    return {
      action: GameAction.BUY,
      args: args,
      original: input
    };
  }
  
  if (isSellCommand(command)) {
    return {
      action: GameAction.SELL,
      args: args,
      original: input
    };
  }
  
  if (isHealCommand(command)) {
    return {
      action: GameAction.HEAL,
      args: args,
      original: input
    };
  }
  
  // 지도 명령어
  if (isMapCommand(command)) {
    return {
      action: GameAction.MAP,
      args: args,
      original: input
    };
  }
  
  // 명령어가 아닌 경우 일반 채팅으로 처리
  return {
    action: GameAction.CHAT,
    args: [],
    original: input
  };
}

// ========== 명령어 판별 함수들 ==========

function isMoveCommand(cmd: string): boolean {
  const moveCommands = ['이동', '가기', '가'];
  return moveCommands.includes(cmd);
}

function isAttackCommand(cmd: string): boolean {
  const attackCommands = ['공격', '때리기', '치기'];
  return attackCommands.includes(cmd);
}

function isFleeCommand(cmd: string): boolean {
  const fleeCommands = ['도망', '도망가기', '도망치기'];
  return fleeCommands.includes(cmd);
}

function isFightCommand(cmd: string): boolean {
  const fightCommands = ['전투', '싸우기', '맞서기'];
  return fightCommands.includes(cmd);
}

function isInventoryCommand(cmd: string): boolean {
  const invCommands = ['인벤토리', '가방', '소지품'];
  return invCommands.includes(cmd);
}

function isGetItemCommand(cmd: string): boolean {
  const getCommands = ['줍기', '주우기', '가져가기', '얻기'];
  return getCommands.includes(cmd);
}

function isUseItemCommand(cmd: string): boolean {
  const useCommands = ['사용', '쓰기', '먹기'];
  return useCommands.includes(cmd);
}

function isDropItemCommand(cmd: string): boolean {
  const dropCommands = ['버리기', '던지기', '놓기'];
  return dropCommands.includes(cmd);
}

function isStatusCommand(cmd: string): boolean {
  const statusCommands = ['상태', '정보', '내정보'];
  return statusCommands.includes(cmd);
}

function isLookCommand(cmd: string): boolean {
  const lookCommands = ['주변', '둘러보기'];
  return lookCommands.includes(cmd);
}

function isHelpCommand(cmd: string): boolean {
  const helpCommands = ['도움말', '도움', '명령어', '도와줘'];
  return helpCommands.includes(cmd);
}

function isQuestCommand(cmd: string): boolean {
  const questCommands = ['퀘스트', '임무', '미션'];
  return questCommands.includes(cmd);
}

function isTalkCommand(cmd: string): boolean {
  const talkCommands = ['대화', '말하기', '이야기'];
  return talkCommands.includes(cmd);
}

function isShopCommand(cmd: string): boolean {
  const shopCommands = ['상점', '구매목록', '상점열기'];
  return shopCommands.includes(cmd);
}

function isBuyCommand(cmd: string): boolean {
  const buyCommands = ['구매', '사기', '살'];
  return buyCommands.includes(cmd);
}

function isSellCommand(cmd: string): boolean {
  const sellCommands = ['판매', '팔기', '팔아'];
  return sellCommands.includes(cmd);
}

function isHealCommand(cmd: string): boolean {
  const healCommands = ['회복', '휴식', '치유'];
  return healCommands.includes(cmd);
}

function isLookAtCommand(cmd: string): boolean {
  const lookAtCommands = ['보기', '관찰', '확인'];
  return lookAtCommands.includes(cmd);
}

function isMapCommand(cmd: string): boolean {
  const mapCommands = ['지도', '맵'];
  return mapCommands.includes(cmd);
}

function isSkillCommand(cmd: string): boolean {
  const skillCommands = ['강타', '회피', '스킬'];
  return skillCommands.includes(cmd);
}

// ========== 방향 파싱 ==========

/**
 * 방향 문자열을 표준화된 방향으로 변환 (한글만 지원)
 */
function parseDirection(dir: string): string | null {
  const directionMap: { [key: string]: string } = {
    // 북
    '북': 'north',
    '위': 'north',
    '위쪽': 'north',
    '북쪽': 'north',
    // 남
    '남': 'south',
    '아래': 'south',
    '아래쪽': 'south',
    '남쪽': 'south',
    // 동
    '동': 'east',
    '오른쪽': 'east',
    '동쪽': 'east',
    // 서
    '서': 'west',
    '왼쪽': 'west',
    '서쪽': 'west',
    // 위 (층 이동)
    '위층': 'up',
    '위로': 'up',
    // 아래 (층 이동)
    '아래층': 'down',
    '아래로': 'down'
  };
  
  return directionMap[dir] || null;
}

export { parseCommand };

