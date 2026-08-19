# 관계온도 (Relationship Temperature)

카카오톡 대화를 분석해 관계의 상태를 점수로 보여주는 서비스입니다.

```
backend_team/
├── compose.yaml     PostgreSQL · MongoDB 컨테이너
├── .env.example     환경변수 템플릿
└── backend/         Spring Boot API (Java 21)
```

> 프론트엔드는 아직 이 저장소에 없습니다. 추가되면 이 문서에 실행 방법을 덧붙입니다.

## 빠른 시작

**필요한 것: Docker Desktop, Java 21**

```bash
git clone https://github.com/KTB-4-AI-Hackathon/backend_team.git
cd backend_team

docker compose up -d          # PostgreSQL + MongoDB
cd backend && ./gradlew bootRun
```

| 주소 | 내용 |
|---|---|
| http://localhost:8080/actuator/health | 헬스체크 |
| http://localhost:8080/api/v1/auth/kakao/authorize | 카카오 로그인 진입 |

기본 프로필은 **H2 메모리 DB**와 AI stub을 쓰기 때문에 Docker 없이도 백엔드는 뜹니다.
PostgreSQL로 붙이려면 아래 "PostgreSQL로 실행"을 보세요.

## Java 21 설치

프로젝트는 Java 21 toolchain을 씁니다. 없으면 Gradle이 이렇게 실패합니다.

```
Cannot find a Java installation on your machine matching: {languageVersion=21}
```

macOS 기준:

```bash
brew install openjdk@21
mkdir -p ~/Library/Java/JavaVirtualMachines
ln -sfn /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk \
        ~/Library/Java/JavaVirtualMachines/openjdk-21.jdk
```

기존 JDK는 지워지지 않습니다. Gradle이 프로젝트별 요구 버전을 알아서 고릅니다.
`sudo`도 필요 없습니다.

## 인프라 (Docker)

`compose.yaml`은 **저장소 루트**에 있습니다.

```bash
docker compose up -d          # 전체 기동
docker compose ps             # 상태 확인
docker compose logs -f postgres
docker compose down           # 정지 (데이터 유지)
docker compose down -v        # 데이터까지 삭제
```

| 서비스 | 포트 | 용도 |
|---|---|---|
| postgres | 5432 | 운영 프로필 DB |
| mongo | 27017 | |

계정은 셋 다 `relationship_temperature` 로 동일합니다.

```bash
docker compose exec postgres psql -U relationship_temperature -d relationship_temperature

docker compose exec mongo mongosh -u relationship_temperature -p relationship_temperature \
  --authenticationDatabase admin relationship_temperature
```

```
jdbc:postgresql://localhost:5432/relationship_temperature
mongodb://relationship_temperature:relationship_temperature@localhost:27017/relationship_temperature?authSource=admin
```

## 백엔드 실행

```bash
cd backend
./gradlew bootRun      # H2 메모리 DB (기본)
./gradlew test
```

### PostgreSQL로 실행

```bash
docker compose up -d postgres
cd backend && SPRING_PROFILES_ACTIVE=prod ./gradlew bootRun
```

`prod` 프로필은 `.env`의 값을 요구합니다.

## 환경변수

`.env.example`을 복사해 `.env`를 만듭니다. `.env`는 커밋되지 않습니다.

```bash
cp .env.example .env
```

| 변수 | 용도 |
|---|---|
| `KAKAO_CLIENT_ID` | 카카오 **REST API 키** (JavaScript 키가 아닙니다) |
| `KAKAO_CLIENT_SECRET` | 카카오 Client Secret |
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | PostgreSQL 접속 |
| `FRONTEND_BASE_URL` | 로그인 성공 후 돌아갈 주소 (기본 `http://localhost:5173`) |
| `AI_BASE_URL` / `AI_SERVICE_TOKEN` | AI 서비스 연동 |

**REST API 키와 Client Secret은 서버 전용 비밀값입니다. 커밋하지 마세요.**

## 카카오 로그인 설정

[카카오 개발자 콘솔](https://developers.kakao.com/console/app)에서 아래를 설정합니다.

| 위치 | 할 일 |
|---|---|
| 앱 설정 > 앱 키 | **REST API 키** 복사 |
| 앱 설정 > 플랫폼 > Web | 사이트 도메인 `http://localhost:8080` 등록 |
| 제품 설정 > 카카오 로그인 | 활성화 **ON** |
| 제품 설정 > 카카오 로그인 > Redirect URI | `http://localhost:8080/api/v1/auth/kakao/callback` |
| 제품 설정 > 카카오 로그인 > 동의항목 | 닉네임, 프로필 사진 |

동의항목을 켜지 않으면 로그인은 되지만 닉네임이 내려오지 않습니다.

로그인 흐름을 확인하려면:

```bash
curl -i http://localhost:8080/api/v1/auth/kakao/authorize
# 302 → /oauth2/authorization/kakao → kauth.kakao.com
```

## 문제가 생기면

| 증상 | 해결 |
|---|---|
| `Cannot find a Java installation ... 21` | 위 "Java 21 설치" 절차를 따르세요 |
| `Port 8080 was already in use` | `pkill -f RelationshipTemperatureApplication` |
| `Cannot connect to the Docker daemon` | Docker Desktop이 실행 중인지 확인 |
| `KOE101` | REST API 키가 아닌 다른 키를 넣었거나 오타입니다 |
| `KOE004` | 콘솔에서 카카오 로그인이 비활성 상태입니다 |
| `KOE006` | Redirect URI가 콘솔 등록값과 정확히 일치하지 않습니다 |
| 닉네임이 비어 있음 | 콘솔의 동의항목에서 닉네임을 켜세요 |
| DB를 초기화하고 싶음 | `docker compose down -v` 후 다시 실행 |

## 더 읽을 것

- [`backend/README.md`](./backend/README.md) — 백엔드 패키지 구조와 설계 원칙
