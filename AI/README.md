# AI Agent (Google Vertex AI ADK)

Google Cloud Vertex AI Agent Development Kit (ADK)를 기반으로 한 AI 에이전트입니다.

## 사전 준비 사항

1. **Google Cloud 프로젝트 생성 및 Billing 활성화**
2. **Vertex AI API 활성화**
   - Google Cloud Console에서 `Vertex AI API`를 검색하여 활성화합니다.
3. **Google Cloud SDK 설치 및 인증**
   ```bash
   gcloud auth application-default login
   gcloud config set project YOUR_PROJECT_ID
   ```

## 설치

필요한 라이브러리를 설치합니다.
```bash
pip install -r requirements.txt
```
(참고: `google-cloud-aiplatform` 패키지가 필요합니다.)

## 환경 변수 설정

`AI/` 폴더 내에 `.env` 파일을 생성하거나 루트 `.env`에 다음 내용을 추가하세요.

```ini
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=us-central1
```

## 실행 방법

```bash
python AI/agent.py
```

## 코드 구조

- `AI/agent.py`: `vertexai.agent_engines.AdkApp`을 사용하여 에이전트를 초기화하고 실행하는 메인 코드입니다.

