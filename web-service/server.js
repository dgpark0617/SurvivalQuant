const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT || 3000;

// Next.js 앱 준비
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handle);

  // Socket.io 서버 생성
  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
  });

  // Socket.io 연결 오류 로깅
  io.engine.on("connection_error", (err) => {
    console.error("Socket.io 연결 오류:", err);
  });

  // TypeScript 파일을 실행하기 위해 ts-node/register 사용
  let GameEngine, parseCommand;
  
  try {
    // 프로덕션과 개발 환경 모두에서 ts-node 사용
    try {
      // ts-node 설정 (tsconfig.server.json 사용)
      require('ts-node').register({
        project: './tsconfig.server.json',
        transpileOnly: true
      });
    } catch (error) {
      console.error('ts-node를 찾을 수 없습니다. npm install ts-node를 실행하세요.');
      throw error;
    }
    
    // 게임 엔진 import
    const gameModule = require('./lib/game/engine');
    const parserModule = require('./lib/game/parser');
    GameEngine = gameModule.GameEngine;
    parseCommand = parserModule.parseCommand;
    
    console.log('게임 엔진 로드 성공');
  } catch (error) {
    console.error('게임 엔진 로드 실패:', error);
    console.error('에러 상세:', error.stack);
    process.exit(1);
  }

  // 게임 엔진 인스턴스 생성
  let gameEngine;
  try {
    gameEngine = new GameEngine();
    console.log('게임 엔진 인스턴스 생성 성공');
  } catch (error) {
    console.error('게임 엔진 인스턴스 생성 실패:', error);
    console.error('에러 상세:', error.stack);
    process.exit(1);
  }

  io.on("connection", (socket) => {
    console.log("플레이어 접속:", socket.id);

    // 플레이어 접속 처리
    socket.on("player:join", (data) => {
      console.log("player:join 이벤트 수신:", data);
      try {
        const player = gameEngine.handlePlayerJoin(socket.id, data.name);
        console.log("플레이어 생성 성공:", player.name);
        
        // 환영 메시지와 함께 현재 위치 정보 표시
        const { GameAction } = require('./lib/game/types');
        const lookResult = gameEngine.handleCommand(socket.id, {
          action: GameAction.LOOK,
          args: [],
          original: 'look'
        });
        
        socket.emit("player:joined", { 
          player, 
          message: `환영합니다, ${data.name}님!\n\n${lookResult.message || ''}` 
        });
        console.log("player:joined 이벤트 전송 완료");
        
        // 현재 위치 정보 전송
        const locationInfo = gameEngine.getLocationInfo(player.location);
        if (locationInfo) {
          socket.emit("game:info", locationInfo);
        }
      } catch (error) {
        console.error("플레이어 접속 오류:", error);
        console.error("에러 상세:", error.stack);
        socket.emit("game:error", { 
          message: "플레이어 접속 중 오류가 발생했습니다." 
        });
      }
    });

    // 게임 명령어 처리
    socket.on("game:command", (data) => {
      try {
        const parsed = parseCommand(data.command);
        const result = gameEngine.handleCommand(socket.id, parsed);
        
        if (result.success) {
          socket.emit("game:update", {
            type: parsed.action,
            data: result.data,
            message: result.message
          });
          
          // 브로드캐스트가 필요한 경우
          if (result.broadcast) {
            socket.broadcast.emit("game:update", {
              type: parsed.action,
              data: result.data,
              message: result.message
            });
          }
          
          // 이동 명령어인 경우 위치 정보 업데이트
          if (parsed.action === 'move') {
            const player = gameEngine.getPlayer(socket.id);
            if (player) {
              const locationInfo = gameEngine.getLocationInfo(player.location);
              if (locationInfo) {
                socket.emit("game:info", locationInfo);
              }
            }
          }
        } else {
          socket.emit("game:error", { message: result.message });
        }
      } catch (error) {
        console.error("명령어 처리 오류:", error);
        socket.emit("game:error", { 
          message: "명령어 처리 중 오류가 발생했습니다." 
        });
      }
    });

    // 채팅 메시지 처리
    socket.on("chat:message", (data) => {
      try {
        const player = gameEngine.getPlayer(socket.id);
        if (player) {
          io.emit("chat:message", {
            player: player.name,
            message: data.message,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error("채팅 메시지 처리 오류:", error);
      }
    });

    // 연결 해제 처리
    socket.on("disconnect", () => {
      console.log("플레이어 퇴장:", socket.id);
      try {
        gameEngine.handlePlayerDisconnect(socket.id);
      } catch (error) {
        console.error("플레이어 퇴장 처리 오류:", error);
      }
    });
  });

  // 서버 시작
      // 틱 시스템에서 전투 결과를 Socket.io로 전송
      const tickSystem = gameEngine.getTickSystem();
      
      // 틱마다 전투 결과 처리 (3초마다)
      setInterval(() => {
        gameEngine.processTickResults(io);
      }, 3000);

      httpServer
        .once("error", (err) => {
          console.error(err);
          process.exit(1);
        })
        .listen(port, () => {
          console.log(`> Ready on http://${hostname}:${port}`);
          console.log('틱 시스템 활성화 (3초 간격)');
        });
    });
