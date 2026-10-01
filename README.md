# Gangwon Association Mobile App

Capacitor 6 기반 모바일 업무앱입니다. 신규 백엔드를 만들지 않고 기존 Railway 운영 서버를 그대로 호출합니다.

## UI
- 토스/카카오뱅크 계열의 모바일 금융앱 문법을 기준으로 재설계
- 큰 숫자, 넓은 여백, 단순 카드, 하단 4탭(홈/회원/미수금/더보기)

## 주요 화면
- 홈: 전체회원 통계, 미수금, 예정자, 최근업무, 빠른 실행
- 회원: 회원관리 / 부과대수 / 예정자 / 양도양수 / 폐업현황 / 변경이력
- 미수금: 대시보드 / 회원별 목록 / 상세 / 입금 / 잔액수정 / 연락기록 / 가져오기 / 엑셀
- 더보기: 기한관리 / SMS / 자격증명 / 보고서 / 통계 / 엑셀 / Glosign / 계정

## 매핑 기준
`screen-function-mapping.xlsx` 확정 기준:
- 모바일 구현 대상 146
- 관리자·고급 운영 도구 62
- 서버 전용 보존 7
- 사용자 승인 레거시 연동 폐기 1
- 총 216

모바일 146개 액션은 `www/js/screens/more.js`의 `MOBILE_TOOL_CATALOG`에 전부 매핑되어 있습니다.
주요 반복 업무는 전용 모바일 화면으로 구현했고, 나머지 보조/고급 액션은 각 모듈의 `전체 기능` 화면에서 기존 API를 직접 호출할 수 있게 연결했습니다.

## 운영 서버
`https://member-management-production.up.railway.app`

## 실행
```bash
npm install
npx cap add android
npx cap sync
npx cap open android
```

iOS는 macOS에서:
```bash
npx cap add ios
npx cap sync
npx cap open ios
```

## 검증 완료
- 전체 JavaScript `node --check` 통과
- 정적 HTTP 서버에서 index / CSS / JS 경로 200 확인
- 실제 운영 계정이 필요한 쓰기 API는 이 환경에서 실데이터 변경 테스트하지 않음

## 주의
회원 등록/수정/삭제, 수납 등록, 문자 발송, 엑셀 반영 등은 운영 데이터를 변경합니다. 최초 실기기 테스트는 조회 기능부터 확인한 뒤 쓰기 기능을 테스트하세요.
