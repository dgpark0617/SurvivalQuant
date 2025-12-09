# Personal AI Assistant (feat. Google Vertex AI ADK)

이 프로젝트는 Google Cloud Vertex AI **Agent Development Kit (ADK)**를 활용하여, 내 컴퓨터에서 동작하는 **개인 맞춤형 AI 비서**를 구축하는 것을 목표로 합니다.

단순한 챗봇을 넘어, 실제 PC 사용을 보조하고 업무 효율을 높여주는 **Practical Agent**를 지향하며, 이 과정에서 ADK 활용 실무 역량을 기릅니다.

## 🎯 프로젝트 목표
1. **Google ADK 마스터**: Vertex AI ADK의 구조(Agent, App, Session, Memory)를 깊이 이해하고 활용합니다.
2. **실무형 에이전트 개발**: 단순 대화 모델이 아닌, 도구(Tools)를 사용하여 실제 작업을 수행하는 에이전트를 만듭니다.
3. **개인화 (Personalization)**: 나의 작업 패턴, 선호도, 데이터를 기억하고 맞춤 지원하는 비서를 구현합니다.

## 🛠 기술 스택
- **Core**: Google Vertex AI Agent Development Kit (ADK)
- **Model**: Gemini 2.0 Flash / Pro
- **Tools**: 
    - Brave Search (웹 검색)
    - Local File System (파일 관리)
    - (추가 예정) Calendar, Email, PC Control
- **Language**: Python 3.10+

## 📂 폴더 구조
- `AI/`: 에이전트 핵심 코드 (ADK 기반)
- `archive/`: 이전 프로젝트(암호화폐 봇) 백업 자료
- `.env`: 환경 변수 (API 키 등)

## 🚀 시작하기

### 1. 환경 설정
```bash
pip install -r requirements.txt
```

### 2. Google Cloud 인증
```bash
gcloud auth application-default login
```

### 3. 에이전트 실행
```bash
python AI/agent.py
```
