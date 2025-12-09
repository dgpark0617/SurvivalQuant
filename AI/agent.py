import os  # 운영체제 관련 기능을 사용하기 위한 모듈 (환경변수 읽기 등)
import asyncio  # 비동기 프로그래밍을 위한 모듈 (ADK의 많은 함수가 비동기로 동작함)
from dotenv import load_dotenv  # .env 파일에서 환경변수를 로드하기 위한 라이브러리

# Google Vertex AI ADK 관련 라이브러리 임포트
try:
    from google.genai import types
    from google.adk.agents import Agent
    from vertexai.agent_engines import AdkApp
    import vertexai
except ImportError:
    print("Google ADK 라이브러리가 설치되지 않았습니다. requirements.txt를 확인해주세요.")
    exit(1)

# 환경 설정 로드
load_dotenv()
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
MODEL_NAME = "gemini-2.0-flash-001"

def create_adk_app():
    """
    나만의 개인 비서(Personal Assistant) 에이전트를 생성합니다.
    """
    if not PROJECT_ID:
        raise ValueError("GOOGLE_CLOUD_PROJECT 환경 변수가 설정되지 않았습니다.")

    vertexai.init(project=PROJECT_ID, location=LOCATION)

    # 1. 비서의 성격 및 역할 정의 (System Instructions)
    # 이곳이 에이전트의 '영혼'을 불어넣는 곳입니다.
    system_instruction = """
    당신은 사용자의 컴퓨터에서 동작하는 유능한 AI 개인 비서(Personal Assistant)입니다.
    
    [당신의 역할]
    1. 사용자의 업무와 일상을 적극적으로 돕습니다.
    2. 질문에 대해 명확하고 실용적인 답변을 제공합니다.
    3. 단순히 정보를 나열하기보다, 사용자가 취해야 할 행동(Actionable Item)을 제안합니다.
    4. 친근하지만 전문적인 태도(Professional & Friendly)를 유지합니다.
    
    [현재 환경]
    - 당신은 Google Vertex AI ADK 기반으로 작동 중입니다.
    - 사용자의 로컬 환경에서 실행되고 있음을 인지하세요.
    """

    # 2. 안전 설정 (Safety Settings)
    # 개인 비서로서 너무 엄격한 필터링보다는 유연한 대화를 위해 임계값을 낮춥니다.
    safety_settings = [
        types.SafetySetting(
            category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
        ),
    ]

    # 3. 생성 설정 (Generation Config)
    generate_content_config = types.GenerateContentConfig(
        safety_settings=safety_settings,
        temperature=0.7,  # 약간의 창의성을 위해 0.7로 상향
        max_output_tokens=2048, # 긴 답변도 가능하게 확장
        top_p=0.95,
    )

    # 4. 에이전트 정의
    agent = Agent(
        model=MODEL_NAME,
        name='personal_assistant',  # 이름 변경
        generate_content_config=generate_content_config,
        # ADK 최신 버전에서는 instructions 파라미터나 system_instruction을 지원합니다.
        # (라이브러리 버전에 따라 다를 수 있으므로, 프롬프트 엔지니어링으로 처리할 수도 있음)
    )

    # 5. 앱 생성
    app = AdkApp(agent=agent)
    
    return app

async def run_chat_session():
    """
    개인 비서와의 대화 세션
    """
    try:
        app = create_adk_app()
        print(f"🤖 안녕하세요! 당신의 AI 비서 '{app.agent.name}'가 준비되었습니다.")
        
        user_id = "master_user" # 사용자를 '주인님'으로 인식하도록 ID 설정
        session = await app.async_create_session(user_id=user_id)
        
        # 첫 인사 메시지 보내기 (System Instruction이 잘 먹혔는지 확인용)
        # (일반적으로는 사용자가 먼저 말을 걸지만, 비서가 먼저 인사할 수도 있음)
        
        print("\n--- 대화 시작 (종료: 'exit') ---")
        while True:
            user_input = input("\n나: ")
            if user_input.lower() in ['exit', 'quit', 'q']:
                print("AI: 좋은 하루 되세요! 언제든 다시 불러주세요.")
                break
                
            print("비서: ", end="", flush=True)
            
            # System Instruction을 매 턴마다 강제할 수는 없으므로, 
            # 첫 세션 생성 시나 Agent 정의 시 주입되는 것이 가장 좋습니다.
            # 여기서는 순수 대화만 오고 갑니다.
            async for event in app.async_stream_query(
                user_id=user_id,
                session_id=session.id,
                message=user_input
            ):
                print(event, end="") 
            print()

    except Exception as e:
        print(f"\n[오류] 비서 시스템에 문제가 발생했습니다: {e}")

if __name__ == "__main__":
    asyncio.run(run_chat_session())
