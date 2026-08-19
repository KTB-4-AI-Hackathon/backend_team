# Woo 담당 기능 구현 진행 기록

이 문서는 Woo 담당 백엔드 기능을 항목 단위로 구현하고 검증한 결과를 누적 기록한다.
각 항목은 구현 완료 후 검증 결과와 수동 확인 방법까지 함께 갱신한다.

## 1. 인물·관계 관리 기능

- 상태: 완료
- 기준 커밋: `acb20c6` (`인물·관계 관리 기능 구현`)
- API:
  - 관계 등록: `POST /api/v1/relationships`
  - 관계 목록·검색: `GET /api/v1/relationships`
  - 관계 상세: `GET /api/v1/relationships/{relationshipId}`
  - 관계 수정: `PATCH /api/v1/relationships/{relationshipId}`
  - 관계 삭제: `DELETE /api/v1/relationships/{relationshipId}`
- 구현 내용:
  - 관계 이름과 관계 유형 CRUD
  - 로그인 사용자 기준 소유권 격리
  - 이름 검색, 상태 필터, 정렬
  - `DRAFT`, `ANALYZING`, `ANALYZED`, `FAILED` 상태 관리
  - Bean Validation, 공통 오류 응답, CSRF 보호 적용
- 검증:
  - 도메인·서비스·컨트롤러 테스트 통과
- 연동 메모:
  - 분석 파이프라인이 시작·완료·실패할 때 관계 상태를 전이해야 한다.
  - 파생 데이터가 추가된 뒤 관계 삭제 정책은 해당 데이터와 함께 재검토한다.

## 2. 관계 체크인 저장 기능

- 상태: 완료
- API:
  - 주차 체크인 저장·갱신: `POST /api/v1/relationships/{relationshipId}/check-ins`
  - 관계별·주차별 이력: `GET /api/v1/relationships/{relationshipId}/check-ins`
- 구현 내용:
  - `RELATIONSHIP_FEELING`, `CONVERSATION_COMFORT` 두 문항의 1~7점 응답 저장
  - `check_ins`와 `check_in_answers`로 체크인 헤더와 문항 응답 정규화
  - 사용자 타임존의 제출일을 기준으로 월요일 `weekStart` 산출
  - 관계·주차 유일성 보장 및 같은 주 재제출 시 기존 응답 갱신
  - `from`, `to` 경곗값을 포함하는 기간 조회와 최신 주차 우선 정렬
  - 관계 소유권 격리, 쓰기 요청 CSRF 검증
  - 질문 누락·중복과 1~7점 범위 검증
  - Flyway V2에서 기존 체크인 점수 컬럼을 문항별 응답 행으로 이관한 뒤 제거
- 자동 검증:
  - 체크인 관련 테스트 8건 통과
  - 프로젝트 전체 회귀 테스트 20건 통과 (`failures=0`, `errors=0`, `skipped=0`)
  - 체크인 엔티티 점수 검증 테스트
  - 최초 생성과 같은 주 갱신 테스트
  - 주차 이력 최신순·기간 필터 테스트
  - 질문 누락·중복·점수 범위 테스트
  - 관계 소유권·CSRF 테스트
  - 역전된 기간 범위 테스트
  - V1 기존 데이터의 V2 마이그레이션 테스트
- Postman 확인:
  1. 로그인 세션 쿠키를 유지하고 `GET /api/v1/users/me` 응답의 CSRF 토큰을 준비한다.
  2. 관계 ID로 체크인을 최초 제출해 `201 Created`와 두 응답을 확인한다.
  3. 같은 주에 점수를 바꿔 다시 제출해 `200 OK`와 동일한 체크인 ID를 확인한다.
  4. 이력 API의 최신순 정렬과 `from`, `to` 기간 필터를 확인한다.
  5. 점수 범위 위반, 질문 누락·중복, CSRF 누락, 다른 사용자의 관계 접근 오류를 확인한다.

## 남은 Woo 담당 항목

- [ ] 관계 리포트 및 분석 근거 생성
- [ ] 메인 대시보드 집계 API
