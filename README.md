# FOODIVERSE 홈페이지

한국의 프리미엄 축산물 직수입 파트너 **푸디버스(Foodiverse)** 공식 웹사이트 소스입니다.
미국·캐나다·호주·뉴질랜드·스페인 등 글로벌 생산지에서 한국 시장으로 축산물을 공급합니다.

- 라이브 사이트: https://www.foodiverse.co.kr
- 배포: Vercel (main 브랜치 자동 배포)
- 문의: import@foodiverse.co.kr · +82 2-2299-8912

---

## 사이트 구조

싱글 페이지 구성이며, `index.html` 안에 모든 섹션이 들어 있습니다.

| # | 섹션 | 앵커 | 내용 |
|---|---|---|---|
| 01 | Overview | `#overview` | 글로벌 소싱부터 전국 유통까지 |
| 02 | Services | `#services` | 소싱 / 직수입·통관 / 콜드체인 / B2B 공급 |
| 03 | Brands | `#brands` | 9개 핵심 직수입 파트너 브랜드 |
| 04 | Capabilities | `#capabilities` | 차별화된 역량 |
| 05 | Reports | `#reports` | 주간 글로벌 축산물 시장 리포트 (AI 자동 생성) |
| 06 | Contact | `#contact` | 파트너십 문의 폼 |

한국어/영어 이중 언어 지원. `?lang=en` 파라미터로 영문 강제 로드 가능.

---

## 어디를 어떻게 수정하나 (비개발자용)

**GitHub 웹/모바일에서 파일을 열고 우측 상단 연필(✏️) 아이콘**을 누르면 브라우저에서 바로 편집·저장 가능합니다.
저장(커밋)하면 2~3분 안에 Vercel이 자동 재배포합니다.

### 자주 바꾸는 것들

| 바꾸고 싶은 것 | 파일 | 검색할 키워드 |
|---|---|---|
| 대표 전화번호 | `index.html` | `2299-8912` |
| 대표 이메일 | `index.html` | `import@foodiverse.co.kr` |
| 카카오 채널 링크 | `index.html` | `pf.kakao.com/_foodiverse` |
| 업무 시간 | `index.html` | `09:00 — 18:00` |
| 히어로 문구 | `index.html` | `World-Class Meat` |
| 브랜드 목록 (9개) | `index.html` | `brand-card` |
| 메타 설명(SEO) | `index.html` | `meta name="description"` |

### 텍스트 편집 규칙
- 대부분 요소가 한국어/영어 두 버전을 함께 가지고 있어요: `data-kr="한국어" data-en="English"`.
- 둘 다 바꿔야 언어 전환 시 반영됩니다.
- HTML이 포함된 문장은 `data-kr-html` / `data-en-html` 로 되어 있어요 (`&lt;br&gt;` = 줄바꿈).

### 이미지 교체
- 회사 로고: `LOGO.png` — 같은 파일명으로 덮어쓰기.
- (권장) 새 이미지는 정사각 · 배경 투명(PNG).

---

## 주간 뉴스레터 (AI 자동 생성)

`#reports` 섹션의 인사이트 카드는 매주 자동으로 채워집니다.

```
매주 월요일 00:00 UTC
    ↓
Vercel Cron → /api/cron-draft
    ↓
Claude(web_search)로 글로벌 축산물 시장 조사
    ↓
Notion DB에 draft 카드 저장 (게시=false)
    ↓
[사람이 Notion에서 "게시" 체크박스 켜기]
    ↓
방문자가 사이트 접속 → /api/reports → 게시된 카드만 노출
```

### 발행하기
1. 노션 DB 열기
2. 새로 생성된 draft 카드 확인 (필요 시 문구 수정)
3. **`게시` 체크박스 ON** → 사이트에 즉시 노출 (5분 캐시 후)

### 관련 파일
- 크론 로직: [api/cron-draft.js](api/cron-draft.js)
- 카드 조회 API: [api/reports.js](api/reports.js)
- 크론 스케줄: [vercel.json](vercel.json)

### 필요한 환경변수 (Vercel Project Settings)
- `NOTION_TOKEN` — 노션 인테그레이션 토큰
- `NOTION_DB_ID` — 카드 저장할 DB ID
- `ANTHROPIC_API_KEY` — Claude API 키
- `CRON_SECRET` (선택) — 크론 엔드포인트 인증용

### 노션 DB 스키마 (속성 이름 정확히 일치해야 함)
| 속성 | 타입 | 용도 |
|---|---|---|
| (title) | title | 한국어 제목 |
| `날짜` | date | 발행일 |
| `선택` | select | 카테고리 (Weekly Report / Trend / Alert) |
| `Summary` | rich_text | 한국어 요약 |
| `Title_EN` | rich_text | 영문 제목 |
| `Summary_EN` | rich_text | 영문 요약 |
| `게시` | checkbox | ON = 사이트 노출 |

> ⚠️ 노션에서 이 속성 이름을 바꾸면 코드가 조용히 깨집니다.

---

## 기술 스택

- **Frontend**: 순수 HTML/CSS/JS (프레임워크 없음) — 단일 `index.html`
- **Backend**: Vercel Serverless Functions (`api/*.js`, ESM)
- **AI**: Anthropic Claude (`claude-sonnet-4-6`) + web_search 툴
- **CMS**: Notion Database
- **배포**: Vercel (main 브랜치 자동 배포)
- **문의 폼**: Web3Forms

---

## 로컬에서 확인하기 (선택)

```bash
npm install
npx vercel dev
```

정적 페이지만 볼 거면 `index.html`을 그냥 브라우저에서 열어도 됩니다.
(뉴스레터 API를 테스트하려면 `vercel dev`가 필요합니다.)

---

## 파일 구조

```
.
├── index.html          # 모든 페이지 콘텐츠
├── LOGO.png            # 회사 로고
├── api/
│   ├── cron-draft.js   # 주간 뉴스레터 자동 생성
│   └── reports.js      # 게시된 뉴스레터 조회 API
├── vercel.json         # Vercel 크론 스케줄
├── package.json
└── README.md
```
