import { NextResponse } from "next/server";
import crypto from "node:crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
  const slackSignature = req.headers.get("x-slack-signature") ?? "";
  const rawBody = await req.text();

  const params = new URLSearchParams(rawBody);
  const command = params.get("command");
  const text = params.get("text");
  const userId = params.get("user_id");
  const userName = params.get("user_name");
  const channelId = params.get("channel_id");
  const teamId = params.get("team_id");
  const teamDomain = params.get("team_domain");
  const requestId = crypto.randomUUID();

  console.log("[/api/lunch] incoming", {
    requestId,
    timestamp,
    hasSignature: Boolean(slackSignature),
    command,
    text,
    userId,
    userName,
    channelId,
    teamId,
    teamDomain,
    rawBodyPreview: previewAndRedact(rawBody),
  });

  if (!signingSecret) {
    console.error("[/api/lunch] missing SLACK_SIGNING_SECRET", { requestId });
    return slack200Ephemeral("서버 설정 오류로 처리할 수 없어요. (SLACK_SIGNING_SECRET 누락)");
  }

  if (!verifySlackRequest({ signingSecret, timestamp, slackSignature, rawBody })) {
    console.error("[/api/lunch] invalid slack signature", {
      requestId,
      timestamp,
      hasSignature: Boolean(slackSignature),
      rawBodyPreview: previewAndRedact(rawBody),
    });
    return slack200Ephemeral("요청 인증에 실패했어요. 서버 로그를 확인해주세요.");
  }

  if (command !== "/점심" && command !== "/lunch") {
    console.warn("[/api/lunch] unknown command", { requestId, command });
    return slack200Ephemeral("알 수 없는 명령어예요. `/점심` 또는 `/lunch`를 사용해주세요.");
  }

  return NextResponse.json({
    // Slash command 기본 응답은 ephemeral이지만, in_channel로 보내면 채널에 공유됩니다.
    response_type: "in_channel",
    text: "매칭을 시작합니다!",
    // 필요하면 나중에 디버깅/후속 플로우에 쓸 수 있는 값들
    metadata: {
      user: userName ?? userId ?? null,
      channel: channelId ?? null,
      input: text ?? "",
    },
  });
}

function slack200Ephemeral(text: string) {
  return NextResponse.json({ response_type: "ephemeral", text }, { status: 200 });
}

function previewAndRedact(rawBody: string) {
  const preview = rawBody.length > 500 ? rawBody.slice(0, 500) + "…(truncated)" : rawBody;
  return preview
    .replace(/token=[^&]+/g, "token=[REDACTED]")
    .replace(/trigger_id=[^&]+/g, "trigger_id=[REDACTED]");
}

function verifySlackRequest(args: {
  signingSecret: string;
  timestamp: string;
  slackSignature: string;
  rawBody: string;
}) {
  const { signingSecret, timestamp, slackSignature, rawBody } = args;

  if (!timestamp || !slackSignature) return false;

  // Replay attack 방지: 5분 이내 요청만 허용
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 60 * 5) return false;

  const baseString = `v0:${timestamp}:${rawBody}`;
  const mySig =
    "v0=" + crypto.createHmac("sha256", signingSecret).update(baseString, "utf8").digest("hex");

  // timingSafeEqual은 길이가 같아야 하므로 사전 체크
  if (mySig.length !== slackSignature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(mySig, "utf8"), Buffer.from(slackSignature, "utf8"));
}

