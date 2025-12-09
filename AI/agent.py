import os
import asyncio
from dotenv import load_dotenv

# Google Vertex AI ADK 관련 라이브러리
try:
    from google.genai import types
    from google.adk.agents import Agent
    from vertexai.agent_engines import AdkApp
    import vertexai
except ImportError:
    print("Google ADK 라이브러리가 설치되지 않았습니다.")
    exit(1)

load_dotenv()
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
MODEL_NAME = "gemini-2.0-flash-001"

# --- [1] 도구(Tool) 정의 ---
# 실무에서는 이런 함수들을 모아서 'Tool'로 등록합니다.
def calculator(a: float, b: float, operation: str) -> float:
    """
    간단한 사칙연산을 수행하는 도구입니다.
    
    Args:
        a: 첫 번째 숫자
        b: 두 번째 숫자
        operation: 연산자 ('+', '-', '*', '/')
    """
    if operation == '+': return a + b
    if operation == '-': return a - b
    if operation == '*': return a * b
    if operation == '/': return a / b if b != 0 else 0
    return 0

# --- [2] 앱 생성 함수 ---
def create_adk_app():
    if not PROJECT_ID:
        raise ValueError("GOOGLE_CLOUD_PROJECT 환경 변수가 설정되지 않았습니다.")

    vertexai.init(project=PROJECT_ID, location=LOCATION)

    # 페르소나 정의 (System Instruction)
    # 이곳에 비서의 성격, 말투, 금기사항 등을 상세히 적습니다.
    persona = """
    [Identity]
    당신은 'Jarvis'와 같은 지능형 개인 비서입니다.
    사용자의 업무 효율을 극대화하고, 복잡한 작업을 단순화하는 것이 목표입니다.

    [Tone & Manner]
    - 전문적이고 신뢰감 있는 태도를 유지하세요.
    - 답변은 간결하고 명확하게(Brevity) 하세요.
    - 사용자가 시키지 않아도 필요한 정보가 있다면 먼저 제안(Proactive)하세요.
    - 한국어로 대화하세요.

    [Capabilities]
    - 당신은 도구(Tools)를 사용할 수 있습니다. 질문에 답하기 위해 계산이나 검색이 필요하면 주저 없이 도구를 호출하세요.
    """

    # 안전 설정
    safety_settings = [
        types.SafetySetting(
            category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
        ),
    ]

    # 도구 등록 (Tools)
    # ADK에서는 함수를 리스트 형태로 전달하여 툴로 등록합니다.
    tools = [calculator]

    # 에이전트 정의
    agent = Agent(
        model=MODEL_NAME,
        name='my_personal_assistant',
        generate_content_config=types.GenerateContentConfig(
            safety_settings=safety_settings,
            temperature=0.5, # 비서이므로 너무 창의적이지 않게(정확도 중시)
        ),
        # instruction 파라미터에 페르소나 주입
        instruction=persona,
        tools=tools # 도구 장착
    )

    app = AdkApp(agent=agent)
    return app

async def run_chat_session():
    try:
        app = create_adk_app()
        print(f"🤖 시스템 가동. 비서 '{app.agent.name}' 대기 중입니다.")
        
        user_id = "master_user"
        session = await app.async_create_session(user_id=user_id)
        
        print("\n(종료하려면 'exit' 입력)")
        while True:
            user_input = input("\nMaster: ")
            if user_input.lower() in ['exit', 'quit', 'q']:
                print("Assistant: 시스템을 종료합니다.")
                break
                
            print("Assistant: ", end="", flush=True)
            async for event in app.async_stream_query(
                user_id=user_id,
                session_id=session.id,
                message=user_input
            ):
                # 툴 호출이 발생하면 ADK가 자동으로 처리하거나, 
                # 이벤트 로그에 FunctionCall 정보가 뜹니다.
                print(event, end="") 
            print()

    except Exception as e:
        print(f"\n[System Error] {e}")

if __name__ == "__main__":
    asyncio.run(run_chat_session())
