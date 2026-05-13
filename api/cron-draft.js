import Anthropic from '@anthropic-ai/sdk';

const NOTION_VERSION = '2022-06-28';
const ASIA_SEOUL = 'Asia/Seoul';

function todayKst() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ASIA_SEOUL }).format(new Date());
}

function extractJsonBlock(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  return JSON.parse(raw.trim());
}

async function notionFetch(path, options = {}) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Notion ${options.method || 'GET'} ${path} failed: ${res.status} ${body}`);
  }
  return res.json();
}

async function findTitlePropertyName(dbId) {
  const db = await notionFetch(`/databases/${dbId}`);
  const entry = Object.entries(db.properties).find(([, p]) => p.type === 'title');
  if (!entry) throw new Error('No title property found in Notion database');
  return entry[0];
}

async function generateCards() {
  const client = new Anthropic();
  const dateStr = todayKst();

  const system = `당신은 푸디버스(Foodiverse)의 주간 글로벌 축산물 시장 리포트 큐레이터입니다.
푸디버스는 미국·캐나다·호주·뉴질랜드·스페인 등에서 한국으로 축산물을 공급하는 회사이며,
파트너사(외식·유통·식자재 기업)에게 매주 시장 인사이트를 배포합니다.

## 작업
web_search로 이번주 글로벌 축산물 시장 동향(가격·수급·정책·계절 이슈)을 조사한 뒤,
파트너사가 즉시 활용할 수 있는 인사이트 카드 1~3장을 작성하세요.

## 카드 필드
- title_kr: 한국어 제목 (60자 이내, 핵심 메시지 + 행동 함의)
- title_en: 영문 제목 (자연스러운 비즈니스 영어)
- summary_kr: 한국어 요약 2~3문장 (수치·정책명은 신뢰 출처가 확인된 경우에만 인용. 불확실하면 일반론으로 작성)
- summary_en: 영문 요약 2~3문장
- category: "Weekly Report" | "Trend" | "Alert" 중 하나

## 톤
- 파트너사 행동을 유도하는 실용적 톤 (예: "선적 일정 점검 권고", "메뉴 구성 재검토 시점")
- 회사 마케팅 카피가 아닌 인사이트 리포트 형식
- 추측·과장 금지. 출처가 의심스러우면 차라리 일반론 수준으로 작성

## 주제 가이드
- 미국산 소고기, 캐나다·호주 우육·돈육, 호주 와규, 한우 시장
- 환율(USD/KRW, AUD/KRW), 해상 운임, 콜드체인 이슈
- USDA·MLA·CFIA·관세청 등 공식 데이터 동향

## 출력 형식
\`\`\`json 펜스로 감싼 JSON 객체 하나만 출력. 다른 텍스트 금지.
형식: {"cards": [{"title_kr": "...", "title_en": "...", "summary_kr": "...", "summary_en": "...", "category": "..."}]}

오늘 날짜 (KST): ${dateStr}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system,
    tools: [
      {
        type: 'web_search_20260209',
        name: 'web_search',
        max_uses: 8,
      },
    ],
    messages: [
      {
        role: 'user',
        content:
          '이번주 글로벌 축산물 시장 동향을 web_search로 조사한 뒤, 인사이트 카드를 JSON으로 작성해주세요.',
      },
    ],
  });

  if (response.stop_reason === 'pause_turn') {
    throw new Error('web_search hit iteration limit (pause_turn). Lower scope or raise max_uses.');
  }

  const textBlock = [...response.content].reverse().find((b) => b.type === 'text');
  if (!textBlock) throw new Error('No text block in Claude response');

  const parsed = extractJsonBlock(textBlock.text);
  if (!Array.isArray(parsed.cards) || parsed.cards.length === 0) {
    throw new Error('Claude returned no cards');
  }
  return parsed.cards;
}

async function createNotionPage(dbId, titleProp, dateStr, card) {
  return notionFetch('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: dbId },
      properties: {
        [titleProp]: { title: [{ text: { content: card.title_kr } }] },
        '날짜': { date: { start: dateStr } },
        '선택': { select: { name: card.category } },
        Summary: { rich_text: [{ text: { content: card.summary_kr } }] },
        Title_EN: { rich_text: [{ text: { content: card.title_en } }] },
        Summary_EN: { rich_text: [{ text: { content: card.summary_en } }] },
        '게시': { checkbox: false },
      },
    }),
  });
}

export default async function handler(req, res) {
  const expected = process.env.CRON_SECRET;
  if (expected && req.headers.authorization !== `Bearer ${expected}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const dbId = process.env.NOTION_DB_ID;
    if (!dbId) throw new Error('NOTION_DB_ID not set');

    const [titleProp, cards] = await Promise.all([
      findTitlePropertyName(dbId),
      generateCards(),
    ]);

    const dateStr = todayKst();
    const created = [];
    for (const card of cards) {
      const page = await createNotionPage(dbId, titleProp, dateStr, card);
      created.push({ id: page.id, title: card.title_kr, category: card.category });
    }

    res.status(200).json({ ok: true, count: created.length, cards: created });
  } catch (err) {
    console.error('cron-draft failed:', err);
    res.status(500).json({ error: err.message });
  }
}
