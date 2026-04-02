import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const body: any = {};
    formData.forEach((value, key) => { body[key] = value });

    const userId = body.user_id; // 명령어를 친 사람의 ID
    const userName = body.user_name; // 명령어를 친 사람의 이름

    // [Step 0] 임시 설정 (나중에 PM님이 알려주실 로직이 들어갈 곳)
    const currentTurnUser = "tae zero "; // 예: 오늘 추첨 권한이 있는 사람 아이디
    const channelMembers = ["김태영", "이철수", "박영희", "최미나", "정민수"]; // 채널 멤버 리스트
    const restaurants = ["맛있는 김치찜", "든든한 순대국", "상큼한 포케", "화끈한 마라탕", "육즙가득 수제버거"];

    // 1. 실행 권한 검증
    if (userName !== currentTurnUser) {
      return new Response(`아쉬워요, 오늘 추첨 대상은 *"${currentTurnUser}"* 님이에요! 🥺 권한이 돌아올 때까지 조금만 기다려주세요!`, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // 2. 권한 확인 완료 시 - 친근한 첫 인사 응답
    // (슬랙은 이 응답을 즉시 보여주고, 뒤에서 실제 추첨 로직을 실행합니다)
    
    // 3. 랜덤 추첨 로직 (멤버 1~2명, 식당 3개)
    const selectedMembers = channelMembers
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.random() > 0.5 ? 2 : 1);
    
    const selectedRestaurants = restaurants
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    const message = `
🌟 *오늘의 점심 운세가 도착했습니다!* 🌟

두근두근... 과연 누구와 무엇을 먹게 될까요? 
오늘 점심의 주인공은 바로... 
👉 *${selectedMembers.join(", ")}* 님!

함께 가기 좋은 오늘의 추천 메뉴 3가지예요:
📍 ${selectedRestaurants.map((res, i) => `${i+1}. ${res}`).join("\n📍 ")}

맛있는 점심 드시고 오후도 화이팅하세요! 🔥
    `.trim();

    return new Response(message, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });

  } catch (error) {
    console.error('❌ 에러 발생:', error);
    return new Response("봇에 작은 문제가 생겼어요. 잠시 후 다시 시도해주세요!", { status: 200 });
  }
}