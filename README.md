# SurvivalQuant

간단한 URL을 표시하는 GitHub Pages 웹사이트입니다.

## 🌐 웹사이트 접속

웹사이트는 GitHub Pages를 통해 호스팅됩니다:
**https://dgpark0617.github.io/SurvivalQuant/**

### 방문자수 카운트 관련 코드
[![Hits](https://hits.sh/dgpark0617.github.io/SurvivalQuant.svg?label=%EB%B0%A9%EB%AC%B8%EC%9E%90%20%EC%88%98&color=3695fc)](https://hits.sh/dgpark0617.github.io/SurvivalQuant/)


<a href="https://hits.sh/dgpark0617.github.io/SurvivalQuant/"><img alt="Hits" src="https://hits.sh/dgpark0617.github.io/SurvivalQuant.svg?label=%EB%B0%A9%EB%AC%B8%EC%9E%90%20%EC%88%98&color=3695fc"/></a>

https://hits.sh/dgpark0617.github.io/SurvivalQuant.svg?label=%EB%B0%A9%EB%AC%B8%EC%9E%90%20%EC%88%98&color=3695fc


## 📋 GitHub Pages 설정 방법

1. GitHub 저장소 페이지에서 **Settings** 탭을 클릭합니다
2. 왼쪽 메뉴에서 **Pages**를 클릭합니다
3. **Source** 섹션에서:
   - "Deploy from a branch" 선택
   - Branch: **main** 선택
   - Folder: **/ (root)** 선택
4. **Save** 버튼을 클릭합니다

설정 완료 후 5-10분 정도 기다리면 웹사이트가 활성화됩니다.

## 📁 폴더 구조 및 파일 연결 관계

### 폴더 구조
```
SurvivalQuant/
├── index.html              # 메인 페이지
├── README.md               # 프로젝트 설명 문서
├── ads/                    # 광고 관련 파일
│   └── ad_display.html     # 광고 표시 페이지
├── games/                  # 게임 관련 파일
│   ├── index.html          # 게임 메인 페이지
│   ├── copycat_zookeeper.html
│   ├── doomrl.html
│   └── DungeonDual4.html
├── main/                   # 주요 기능 파일
│   ├── clock.html
│   ├── coin_data.html      # 코인 데이터 표시
│   ├── ip_checker.html
│   └── monte_carlo_simulation.html  # 몬테카를로 시뮬레이션
├── styles/                 # CSS 스타일 파일
│   └── main.css
└── utilities/              # 유틸리티 도구 파일
    ├── index.html          # 유틸리티 메인 페이지
    ├── analog_clock.html
    ├── qr_generator.html
    ├── url_shortener.html
    └── world_clock.html
```

### 파일 연결 구조

#### 메인 페이지 (index.html)
- **외부 링크**:
  - 바이빗 카피트레이딩: `https://www.bybit.com/copyMt5/trade-center/detail?providerMark=xkc2wsLqVomphpP%2FtV6RRQ%3D%3D`
  - 개발블로그: `https://blog.naver.com/economic_eden`
  - 유튜브: `https://www.youtube.com/@economiceden`
  - 자동매매 제작의뢰(가장 중요) : https://open.kakao.com/o/sy2UErbd 
- **내부 링크**:
  - 유틸리티: `utilities/index.html`
  - 게임: `games/index.html`
- **iframe 임베드**:
  - 몬테카를로 시뮬레이션: `main/monte_carlo_simulation.html`
  - 코인 데이터: `main/coin_data.html`
  - 광고 표시: `ads/ad_display.html`

#### 유틸리티 페이지 (utilities/index.html)
- **내부 링크**:
  - 메인으로 돌아가기: `../` (루트 디렉토리의 index.html)
- **iframe 임베드**:
  - 아날로그 시계: `analog_clock.html`
  - QR 코드 생성기: `qr_generator.html`
  - URL 단축기: `url_shortener.html`
  - 세계 시간: `world_clock.html`

#### 게임 페이지 (games/index.html)
- **내부 링크**:
  - 메인으로 돌아가기: `../` (루트 디렉토리의 index.html)
  - 던전 듀얼 4: `DungeonDual4.html`
- **내장 게임**:
  - 틱택토 (페이지 내 JavaScript)
  - 숫자 맞추기 (페이지 내 JavaScript)
  - 기억력 게임 (Coming Soon)

## ✨ 기능
- 코인 데이터 실시간 표시
- 몬테카를로 시뮬레이션 도구
- 다양한 미니 게임
- 유틸리티 도구 (시계, QR 코드 생성기, URL 단축기 등)
