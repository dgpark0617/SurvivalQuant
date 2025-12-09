# 추천 MCP 서버 및 설치 가이드

사용자님의 암호화폐 트레이딩 프로젝트(`SurvivalQuant`)에 가장 도움이 될 **필수 MCP 서버**를 추천해 드립니다.

## 1. 강력 추천: Brave Search MCP
암호화폐 시장은 1분 1초가 중요합니다. AI에게 **"지금 비트코인 왜 떨어져?"**라고 물었을 때, 2023년 데이터가 아닌 **방금 전 뉴스**를 검색해서 대답해 줄 수 있게 합니다.

- **기능**: 실시간 웹 검색 (Google 검색과 유사하지만 API 접근이 용이)
- **비용**: 기본 무료 (Free Tier로 충분)

### 설치 방법 (Cursor IDE)

저는 보안상 사용자님의 Cursor 설정을 직접 수정할 수 없습니다. 아래 순서대로 1분만 투자해서 등록해주세요.

1.  **Brave Search API 키 발급**
    - [Brave Search API Console](https://api.search.brave.com/app/dashboard)에 접속하여 가입 후 API Key를 발급받습니다. (Credit Card 등록 필요 없음)

2.  **Cursor 설정 열기**
    - `Ctrl + Shift + J` (또는 설정 아이콘) -> `Cursor Settings` -> `Features` 탭 -> `MCP` 섹션 찾기.

3.  **MCP 서버 추가 (+ Add New MCP Server)**
    - **Name**: `brave-search` (원하는 이름)
    - **Type**: `command` (stdio)
    - **Command**: 
      ```bash
      npx -y @modelcontextprotocol/server-brave-search
      ```
    - **Environment Variables (환경 변수)**:
      - Key: `BRAVE_API_KEY`
      - Value: `(방금 발급받은 API 키 붙여넣기)`

4.  **저장 및 사용**
    - 저장 후, 저(AI)에게 "최신 비트코인 뉴스를 찾아줘"라고 하면 자동으로 검색 도구를 사용합니다.

---

## 2. 기타 유용한 MCP 추천

### Filesystem MCP (이미 내장됨)
- Cursor는 기본적으로 프로젝트 내의 파일을 읽고 쓸 수 있지만, 보안상 제한된 범위 밖의 파일(예: 바탕화면의 엑셀 파일)을 다뤄야 한다면 `filesystem` MCP를 별도로 설정할 수 있습니다.
- **추천**: 현재 프로젝트 범위 내에서만 작업한다면 굳이 추가 설정 필요 없음.

### PostgreSQL / SQLite MCP
- 만약 트레이딩 기록이 수십만 건 쌓여서 DB에 저장 중이라면, AI가 직접 SQL을 날려서 수익률을 분석하게 할 수 있습니다.
- **설치**: `npx -y @modelcontextprotocol/server-postgres`
- **추천**: 아직 파일 기반(`csv`)이므로 추후 도입 고려.

## 결론
지금 당장은 **Brave Search** 하나만 설치하셔도 AI의 능력이 200% 향상됩니다.

