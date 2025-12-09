# DoomRL의 유니콘 업데이트 계획

## 1. 유니콘 몬스터 타입 추가
- `MONSTER_TYPES` 상수에 `UNICORN: 'UNICORN'` 추가
- `TILES` 객체에 유니콘 시각적 표현 추가: `UNICORN: { symbol: 'U', emoji: '🦄' }`
- 유니콘 체력은 일반 몬스터보다 높게 설정 (`UNICORN_HP = 15`)

## 2. 유니콘 생성 로직
- `placeEntities` 함수에 유니콘 생성 로직 추가
- 일반 몬스터 배치 후 별도로 10마리의 유니콘 배치
- 각 유니콘에 특별 속성 추가:
  ```javascript
  {
    x: m.x, 
    y: m.y, 
    hp: UNICORN_HP, 
    type: MONSTER_TYPES.UNICORN,
    isUnicorn: true,  // 유니콘 식별자
    nextMoveTime: 0,  // 다음 행동 시간 (실시간 턴 시스템용)
    lastSeenPlayer: false, // 플레이어를 마지막으로 본 상태
    targetMonster: null // 공격 대상 몬스터
  }
  ```

## 3. 시야 공유 감지 시스템
- 새로운 전역 변수 추가:
  ```javascript
  let sightGroups = [];  // 시야 공유 그룹 목록
  let realTimeTurnActive = false;  // 실시간 턴 시스템 활성화 상태
  ```

- `calcMonsterFOV` 함수 구현: 몬스터의 시야 계산
  ```javascript
  function calcMonsterFOV(monster) {
    let vis = {};
    for (let dy = -VIEW_R; dy <= VIEW_R; ++dy)
      for (let dx = -VIEW_R; dx <= VIEW_R; ++dx) {
        let tx = monster.x + dx, ty = monster.y + dy;
        if (inMap(tx, ty) && Math.sqrt(dx * dx + dy * dy) <= VIEW_R) {
          los(monster.x, monster.y, tx, ty, (x, y) => {
            vis[`${x},${y}`] = true;
            return map[y][x] !== WALL;
          });
        }
      }
    return vis;
  }
  ```

- `updateSightGroups` 함수 구현: 시야 공유 관계 분석 및 그룹화
  - 플레이어와 모든 유니콘의 시야 계산
  - 시야가 겹치는 엔티티들을 그룹으로 묶음
  - 플레이어가 포함된 그룹이 있으면 실시간 턴 시스템 활성화

## 4. 실시간 턴 시스템
- 새로운 전역 변수 추가:
  ```javascript
  let currentTurnTime = 0;  // 현재 턴의 시작 시간
  let turnDuration = 500;   // 턴 지속 시간 (0.5초)
  let playerActedThisTurn = false;  // 현재 턴에 플레이어가 행동했는지 여부
  ```

- `startRealTimeTurn` 함수 구현: 실시간 턴 시작
  ```javascript
  function startRealTimeTurn() {
    currentTurnTime = Date.now();
    playerActedThisTurn = false;
    
    // 플레이어가 속한 그룹의 유니콘들에게 랜덤 행동 시간 설정
    const playerGroup = sightGroups.find(group => group.hasPlayer);
    if (playerGroup) {
      playerGroup.unicorns.forEach(unicorn => {
        // 0~500ms 사이의 랜덤한 시간에 행동
        unicorn.nextMoveTime = currentTurnTime + Math.floor(Math.random() * turnDuration);
      });
    }
  }
  ```

- `processRealTimeTurn` 함수 구현: 게임 루프에서 실시간 턴 처리
  - 턴 시간이 지났는지 확인
  - 유니콘들의 행동 시간이 되었는지 확인하고 행동 처리
  - 턴 종료 시 새 턴 시작

- `endRealTimeTurn` 함수 구현: 턴 종료 처리
  - 플레이어가 행동하지 않았으면 메시지 표시
  - 시야 공유 그룹 업데이트

- UI 요소 추가: 턴 타이머 바
  ```html
  <div id="turn-timer">
    <div id="turn-timer-bar"></div>
  </div>
  ```

## 5. 유니콘 AI 구현
- `unicornAction` 함수 구현: 유니콘의 행동 처리
  ```javascript
  function unicornAction(unicorn) {
    // 이미 죽었다면 행동하지 않음
    if (unicorn.hp <= 0) return;
    
    // 시야 내 몬스터 찾기 (유니콘은 다른 몬스터만 공격)
    const unicornFOV = calcMonsterFOV(unicorn);
    let nearestMonster = null;
    let minDistance = Infinity;
    
    monsters.forEach(m => {
      // 자기 자신이거나 유니콘이거나 이미 죽은 몬스터는 제외
      if (m === unicorn || m.isUnicorn || m.hp <= 0) return;
      
      // 시야 내에 있는지 확인
      if (unicornFOV[`${m.x},${m.y}`]) {
        // 거리 계산
        const distance = Math.abs(m.x - unicorn.x) + Math.abs(m.y - unicorn.y);
        
        // 더 가까운 몬스터 발견 시 업데이트
        if (distance < minDistance) {
          minDistance = distance;
          nearestMonster = m;
        }
      }
    });
    
    // 가까운 몬스터가 있으면 그 방향으로 이동 또는 공격
    if (nearestMonster) {
      unicorn.targetMonster = nearestMonster;
      const dx = Math.sign(nearestMonster.x - unicorn.x);
      const dy = Math.sign(nearestMonster.y - unicorn.y);
      const dist = Math.max(Math.abs(nearestMonster.x - unicorn.x), Math.abs(nearestMonster.y - unicorn.y));
      
      if (dist <= 1) {
        // 몬스터와 인접해 있으면 공격
        nearestMonster.hp -= 4; // 유니콘은 강한 공격력
        addMsg('유니콘이 몬스터를 공격했습니다!');
        
        if (nearestMonster.hp <= 0) {
          addMsg('유니콘이 몬스터를 처치했습니다!');
          unicorn.targetMonster = null;
        }
      } else {
        // 몬스터 방향으로 이동 시도
        const nx = unicorn.x + dx;
        const ny = unicorn.y + dy;
        
        if (inMap(nx, ny) && map[ny][nx] !== WALL && 
            !monsters.some(m => m !== unicorn && m.x === nx && m.y === ny && m.hp > 0)) {
          unicorn.x = nx;
          unicorn.y = ny;
          addMsg('유니콘이 몬스터를 향해 움직입니다.');
        }
      }
    } else if (unicorn.lastSeenPlayer) {
      // 몬스터가 없고 플레이어를 본 적이 있으면 플레이어 근처로 이동
      const dx = Math.sign(player.x - unicorn.x);
      const dy = Math.sign(player.y - unicorn.y);
      const dist = Math.max(Math.abs(player.x - unicorn.x), Math.abs(player.y - unicorn.y));
      
      // 플레이어와 너무 가까우면 거리를 유지
      if (dist <= 2) {
        // 플레이어로부터 멀어지는 방향 찾기
        const nx = unicorn.x - dx;
        const ny = unicorn.y - dy;
        
        if (inMap(nx, ny) && map[ny][nx] !== WALL && 
            !monsters.some(m => m !== unicorn && m.x === nx && m.y === ny && m.hp > 0)) {
          unicorn.x = nx;
          unicorn.y = ny;
        }
      } else if (dist > 5) {
        // 플레이어와 너무 멀면 가까워짐
        const nx = unicorn.x + dx;
        const ny = unicorn.y + dy;
        
        if (inMap(nx, ny) && map[ny][nx] !== WALL && 
            !monsters.some(m => m !== unicorn && m.x === nx && m.y === ny && m.hp > 0)) {
          unicorn.x = nx;
          unicorn.y = ny;
        }
      } else {
        // 적절한 거리면 랜덤 이동
        randomUnicornMovement(unicorn);
      }
    } else {
      // 플레이어를 본 적이 없으면 랜덤 이동
      randomUnicornMovement(unicorn);
    }
    
    // 행동 후 시야 공유 상태 업데이트
    updateSightGroups();
  }
  
  // 유니콘 랜덤 이동 헬퍼 함수
  function randomUnicornMovement(unicorn) {
    const directions = [
      { dx: -1, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
      { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 }
    ];
    
    // 랜덤 방향 선택
    const dir = directions[Math.floor(Math.random() * directions.length)];
    const nx = unicorn.x + dir.dx;
    const ny = unicorn.y + dir.dy;
    
    // 유효한 위치라면 이동
    if (inMap(nx, ny) && map[ny][nx] !== WALL && 
        !monsters.some(m => m !== unicorn && m.x === nx && m.y === ny && m.hp > 0)) {
      unicorn.x = nx;
      unicorn.y = ny;
    }
  }
  ```

## 6. 기존 코드 수정
- `monsterTurn` 함수 수정: 유니콘은 일반 턴에서 움직이지 않도록 변경
  ```javascript
  function monsterTurn() {
    let vis = calcFOV();
    monsters.forEach(m => {
      // 유니콘은 일반 턴에서는 움직이지 않음 (실시간 턴에서만 움직임)
      if (m.isUnicorn) return;
      
      // 기존 몬스터 AI 로직...
    });
    
    // 몬스터 턴 후 시야 공유 상태 업데이트
    updateSightGroups();
  }
  ```

- `tryMove` 함수 수정: 실시간 턴 시스템 처리 추가
  ```javascript
  function tryMove(dx, dy) {
    // 기존 이동 로직...
    
    // 실시간 턴 시스템에서 플레이어 행동 처리
    if (realTimeTurnActive) {
      playerActedThisTurn = true;
    }
    
    // 이동 후 시야 공유 상태 업데이트
    updateSightGroups();
    
    return true;
  }
  ```

- `render` 함수 수정: 턴 타이머 표시 추가
  ```javascript
  // 실시간 턴 시스템 상태 표시
  if (realTimeTurnActive) {
    turnTimer.style.display = 'block';
    const now = Date.now();
    const elapsed = now - currentTurnTime;
    const remaining = Math.max(0, turnDuration - elapsed);
    const percent = (remaining / turnDuration) * 100;
    
    turnTimerBar.style.width = `${percent}%`;
    
    // 남은 시간에 따라 색상 변경
    if (percent > 60) {
      turnTimerBar.style.backgroundColor = '#0f0'; // 녹색
    } else if (percent > 30) {
      turnTimerBar.style.backgroundColor = '#ff0'; // 노란색
    } else {
      turnTimerBar.style.backgroundColor = '#f00'; // 빨간색
    }
  } else {
    turnTimer.style.display = 'none';
  }
  ```

- `init` 함수 수정: 시야 공유 상태 초기화 추가
  ```javascript
  // 시야 공유 상태 초기화
  updateSightGroups();
  ```

- 게임 루프 추가: 실시간 턴 시스템 처리
  ```javascript
  function startGameLoop() {
    // 게임 루프 간격 (밀리초)
    const GAME_LOOP_INTERVAL = 50; // 50ms마다 업데이트 (초당 20회)
    
    // 게임 루프 설정
    window.gameLoopInterval = setInterval(() => {
      // 게임 오버 상태면 루프 중단
      if (gameOver) {
        clearInterval(window.gameLoopInterval);
        return;
      }
      
      // 실시간 턴 시스템 처리
      if (realTimeTurnActive) {
        processRealTimeTurn();
        
        // 턴 타이머 UI 업데이트
        // ...
      }
    }, GAME_LOOP_INTERVAL);
  }
  ```

## 7. 유니콘 특성 요약
- 유니콘은 플레이어를 공격하지 않고 다른 몬스터만 공격함
- 플레이어와 유니콘의 시야가 겹치면 실시간 턴 시스템이 활성화됨
- 실시간 턴 시스템에서는 0.5초마다 턴이 진행되며, 각 턴에서 유니콘들은 랜덤한 시간에 행동함
- 유니콘은 일반 몬스터보다 체력이 높고 공격력이 강함
- 유니콘은 시야 내에서 가장 가까운 몬스터를 찾아 공격함
- 시야 내에 몬스터가 없으면 플레이어 주변에서 행동함 (단, 일정 거리 유지) 