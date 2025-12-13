'use client';

import { useState } from 'react';

export default function CommandHelp() {
  const [isOpen, setIsOpen] = useState(false);

  const commands = [
    {
      category: '이동',
      commands: [
        { korean: '이동 [방향]', english: '', example: '이동 북, 이동 남', desc: '방향: 북, 남, 동, 서, 위, 아래' }
      ]
    },
    {
      category: '전투',
      commands: [
        { korean: '전투 [몬스터명]', english: '', example: '전투 늑대', desc: '특정 몬스터와 전투 시작 (틱마다 자동 공격)' },
        { korean: '도망', english: '', example: '도망', desc: '전투에서 도망가기 (레벨 차이에 따라 성공률 조정)' },
        { korean: '강타', english: '', example: '강타', desc: '강력한 공격 스킬 (데미지 1.5배, MP 10 소모)' },
        { korean: '회피', english: '', example: '회피', desc: '다음 공격 회피 스킬 (MP 5 소모)' }
      ]
    },
    {
      category: '인벤토리',
      commands: [
        { korean: '인벤토리', english: '', example: '인벤토리', desc: '내 가방 확인하기' },
        { korean: '줍기 [아이템명]', english: '', example: '줍기 체력포션', desc: '바닥에 있는 아이템 주우기' },
        { korean: '사용 [아이템명]', english: '', example: '사용 체력포션', desc: '아이템 사용하기 (전투 중에도 사용 가능)' },
        { korean: '버리기 [아이템명]', english: '', example: '버리기 체력포션', desc: '아이템 버리기' }
      ]
    },
    {
      category: '정보',
      commands: [
        { korean: '상태', english: '', example: '상태', desc: '내 상태 확인하기' },
        { korean: '주변', english: '', example: '주변', desc: '현재 위치 둘러보기' },
        { korean: '보기 [대상명]', english: '', example: '보기 늑대, 보기 퀘스트 제공자', desc: '몬스터나 NPC의 상세 정보 확인' },
        { korean: '지도', english: '', example: '지도', desc: '현재 위치 주변 맵 표시' },
        { korean: '도움말', english: '', example: '도움말', desc: '명령어 도움말 보기' }
      ]
    },
    {
      category: 'NPC 상호작용',
      commands: [
        { korean: '대화 [NPC명]', english: '', example: '대화 퀘스트 제공자', desc: 'NPC와 대화하기' },
        { korean: '상점', english: '', example: '상점', desc: '상점 열기' },
        { korean: '구매 [아이템명]', english: '', example: '구매 체력포션', desc: '아이템 구매하기' },
        { korean: '판매 [아이템명]', english: '', example: '판매 체력포션', desc: '아이템 판매하기' },
        { korean: '회복', english: '', example: '회복', desc: '여관에서 HP와 MP 모두 회복 (비용: 10골드)' }
      ]
    },
    {
      category: '퀘스트',
      commands: [
        { korean: '퀘스트', english: '', example: '퀘스트', desc: '진행 중인 퀘스트 확인' },
        { korean: '퀘스트 수락 [퀘스트ID]', english: '', example: '퀘스트 수락 quest_001', desc: '퀘스트 수락하기' }
      ]
    }
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors shadow-lg z-50"
      >
        📖 도움말
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">📖 게임 명령어 도움말</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
          >
            닫기
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {commands.map((category, idx) => (
            <div key={idx} className="border-b border-gray-700 pb-4 last:border-0">
              <h3 className="text-xl font-semibold mb-3 text-blue-400">{category.category}</h3>
              <div className="space-y-3">
                {category.commands.map((cmd, cmdIdx) => (
                  <div key={cmdIdx} className="bg-gray-700 p-3 rounded">
                    <div className="flex flex-wrap gap-2 mb-1">
                      <span className="font-bold text-green-400 text-lg">{cmd.korean}</span>
                    </div>
                    <div className="text-sm text-gray-300 mb-1">
                      예: <code className="bg-gray-900 px-2 py-1 rounded text-yellow-300">{cmd.example}</code>
                    </div>
                    <div className="text-sm text-gray-400">{cmd.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          <div className="mt-6 p-4 bg-blue-900 rounded">
            <p className="text-sm text-blue-200">
              💡 <strong>팁:</strong> 채팅창에 명령어를 입력하거나, 일반 채팅을 할 수 있습니다. 
              명령어는 모두 한글로 입력하세요!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

