import os  # 운영체제 관련 기능을 사용하기 위한 모듈 (환경변수 읽기 등)
import asyncio  # 비동기 프로그래밍을 위한 모듈 (ADK의 많은 함수가 비동기로 동작함)
from dotenv import load_dotenv  # .env 파일에서 환경변수를 로드하기 위한 라이브러리

# Google Vertex AI ADK 관련 라이브러리 임포트
# try-except 구문은 해당 라이브러리가 설치되지 않았을 때 사용자에게 안내하기 위함입니다.
try:
    # google.genai.types: 생성형 AI 모델의 설정 타입(안전 설정, 생성 설정 등)을 정의하는 모듈
    from google.genai import types
    
    # google.adk.agents.Agent: ADK의 핵심 클래스 중 하나.
    # 특정 모델(Gemini 등)과 그 설정, 이름 등을 묶어 '에이전트'라는 논리적 단위를 만듭니다.
    from google.adk.agents import Agent
    
    # vertexai.agent_engines.AdkApp: 에이전트를 실제로 실행하고 관리하는 애플리케이션 클래스.
    # 세션 관리(대화 기억), 사용자 ID 처리, 비동기 스트리밍 등을 담당합니다.
    from vertexai.agent_engines import AdkApp
    
    # vertexai: Google Cloud Vertex AI 전체를 초기화하고 설정하는 모듈
    import vertexai
except ImportError:
    print("Google ADK 라이브러리가 설치되지 않았습니다. requirements.txt를 확인해주세요.")
    print("pip install google-cloud-aiplatform")
    exit(1)

# .env 파일의 내용을 환경변수로 로드합니다.
# API 키나 프로젝트 ID 같은 민감한 정보는 코드에 직접 쓰지 않고 이렇게 관리하는 것이 좋습니다.
load_dotenv()

# Google Cloud 설정 변수 가져오기
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")  # Google Cloud 프로젝트 ID
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")  # 리전 (기본값: us-central1)
MODEL_NAME = "gemini-2.0-flash-001"  # 사용할 AI 모델 이름 (Gemini 2.0 Flash 사용)

def create_adk_app():
    """
    Google Vertex AI ADK를 사용하여 에이전트 앱을 생성하고 설정하는 함수입니다.
    """
    # 프로젝트 ID가 없으면 실행할 수 없으므로 확인합니다.
    if not PROJECT_ID:
        raise ValueError("GOOGLE_CLOUD_PROJECT 환경 변수가 설정되지 않았습니다.")

    # 1. Vertex AI SDK 초기화
    # 프로젝트와 리전 정보를 바탕으로 Vertex AI 서비스에 연결을 준비합니다.
    vertexai.init(project=PROJECT_ID, location=LOCATION)

    # 2. 모델 안전 설정 (Safety Settings)
    # AI가 생성하는 콘텐츠의 안전성 필터를 설정합니다.
    # 여기서는 '위험한 콘텐츠' 카테고리의 차단 임계값을 OFF(끄기)로 설정하여 필터링을 최소화했습니다.
    # 실제 서비스에서는 적절한 필터링이 필요할 수 있습니다.
    safety_settings = [
        types.SafetySetting(
            category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold=types.HarmBlockThreshold.OFF,
        ),
    ]

    # 3. 콘텐츠 생성 설정 (Generation Config)
    # AI의 답변 스타일을 결정하는 파라미터들입니다.
    generate_content_config = types.GenerateContentConfig(
        safety_settings=safety_settings, # 위에서 정의한 안전 설정 적용
        temperature=0.28,                # 창의성 정도 (0.0: 보수적/정확함 ~ 1.0: 창의적/랜덤함)
        max_output_tokens=1000,          # 답변의 최대 길이 (토큰 단위)
        top_p=0.95,                      # 누적 확률 95% 내의 단어들만 후보로 고려 (다양성 조절)
    )

    # 4. Agent(에이전트) 객체 생성
    # Agent는 '모델 + 설정 + 페르소나'를 하나로 묶은 단위입니다.
    agent = Agent(
        model=MODEL_NAME,                                # 사용할 모델 (Gemini)
        name='survival_quant_agent',                     # 에이전트의 이름 (식별자)
        generate_content_config=generate_content_config, # 답변 생성 설정
        # instructions="...",                            # (선택) 시스템 프롬프트: 에이전트의 역할이나 성격을 부여할 수 있습니다.
    )

    # 5. AdkApp(앱) 객체 생성
    # Agent 객체를 감싸서 실제 '애플리케이션'으로 만듭니다.
    # AdkApp은 사용자와의 세션(대화 맥락)을 관리하고, 메시지를 주고받는 인터페이스를 제공합니다.
    # 필요하다면 memory_service_builder를 통해 대화 기억 저장소를 DB로 연결할 수도 있습니다.
    app = AdkApp(agent=agent)
    
    return app

async def run_chat_session():
    """
    터미널(CLI)에서 사용자가 직접 에이전트와 대화해볼 수 있는 테스트 함수입니다.
    비동기(async)로 동작합니다.
    """
    try:
        # 위에서 만든 설정대로 앱을 생성합니다.
        app = create_adk_app()
        print(f"Agent '{app.agent.name}' initialized with model {app.agent.model}.")
        
        # 테스트를 위한 가상의 사용자 ID입니다.
        user_id = "local_developer"
        
        # 새로운 대화 세션을 생성합니다.
        # 세션(Session)은 대화의 맥락(이전 대화 내용)을 유지하는 단위입니다.
        session = await app.async_create_session(user_id=user_id)
        
        print("\n--- 대화 시작 (종료하려면 'exit' 입력) ---")
        while True:
            # 사용자로부터 입력을 받습니다.
            user_input = input("\nUser: ")
            
            # 종료 명령어 체크
            if user_input.lower() in ['exit', 'quit', 'q']:
                break
                
            print("Agent: ", end="", flush=True)
            
            # app.async_stream_query: 사용자의 메시지를 에이전트에게 보내고 답변을 스트리밍으로 받습니다.
            # 스트리밍(stream)은 답변이 다 완성될 때까지 기다리지 않고, 생성되는 대로 조각조각 받아서 출력하는 방식입니다.
            async for event in app.async_stream_query(
                user_id=user_id,      # 누가 질문했는지
                session_id=session.id, # 어떤 대화 흐름인지 (이전 맥락 유지)
                message=user_input    # 질문 내용
            ):
                # event는 답변의 조각(chunk)을 담고 있습니다.
                # 답변 조각을 즉시 화면에 출력합니다.
                print(event, end="") 
            print() # 답변 완료 후 줄바꿈

    except Exception as e:
        # 에러 발생 시 처리
        print(f"\n[Error] 에이전트 실행 중 오류 발생: {e}")
        print("팁: Google Cloud 인증이 되었는지 확인하세요. (gcloud auth application-default login)")

if __name__ == "__main__":
    # 파이썬의 비동기 메인 루프를 실행하여 run_chat_session 함수를 시작합니다.
    asyncio.run(run_chat_session())
