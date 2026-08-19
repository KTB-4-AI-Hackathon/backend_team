# 배포 가이드 — EC2 1대 + ALB(ACM) + Route53

관계온도 서비스를 AWS에 올리는 절차입니다. 전제 조건은 아래 네 가지입니다.

1. **EC2 1대**에 컨테이너 4개를 모두 올린다
2. 도메인은 **Route53**으로 관리한다 (`ktb-ai-hackathon-team14.com`)
3. 카카오 소셜 로그인을 위해 **HTTPS가 반드시 동작**해야 한다
4. TLS 인증서는 **ACM**을 쓰고, 이를 붙이기 위해 **ALB**를 둔다

---

## 1. 아키텍처

```
                    사용자 브라우저
                          │ HTTPS (443)
                          ▼
              ┌───────────────────────┐
   Route53 ──▶│  ALB  (ACM 인증서)     │  ← 여기서 TLS 종료
   A(Alias)   │  :443 → TG / :80 → 301│
              └───────────┬───────────┘
                          │ HTTP (80)  ※ 평문. VPC 내부 구간
                          ▼
   ┌──────────────────────────────────────────────┐
   │ EC2 1대                                       │
   │  ┌────────────┐                               │
   │  │   front    │ nginx: 정적 서빙 + 리버스 프록시 │
   │  │  (nginx)   │ :80                           │
   │  └─────┬──────┘                               │
   │        │ 도커 내부 네트워크 (호스트 포트 없음)     │
   │  ┌─────▼──────┐                               │
   │  │  backend   │ Spring Boot :8080             │
   │  └──┬──────┬──┘                               │
   │  ┌──▼────┐ ┌▼────────┐                        │
   │  │postgres│ │  mongo  │                        │
   │  └────────┘ └─────────┘                        │
   └──────────────────────────────────────────────┘
```

**핵심**: 인증서는 ALB에만 있습니다. EC2 안에서는 인증서도, 443도, nginx TLS 설정도 쓰지 않습니다.
그래서 배포용 `.env`의 `NGINX_CONF`는 **`nginx.conf`(HTTP 설정) 그대로** 둡니다.
`nginx.tls.conf`는 ALB 없이 EC2에서 직접 Let's Encrypt를 붙이는 다른 구성을 위한 파일이라, 이 가이드에서는 쓰지 않습니다.

---

## 2. HTTPS가 성립하는 원리 — 반드시 이해하고 넘어갈 것

브라우저는 HTTPS로 접속하지만 Spring은 평문 HTTP로 요청을 받습니다.
그래서 **"원래 스킴이 https였다"는 정보를 헤더로 이어 붙여 전달**해야 합니다. 한 군데라도 끊기면 카카오 로그인이 `KOE006`으로 깨집니다.

```
브라우저 ──https──▶ ALB ──http──▶ nginx ──http──▶ Spring
                     │             │              │
                     │ ALB가 자동으로│ 그 값을 그대로  │ forward-headers-strategy:
                     │ X-Forwarded- │ 다시 전달       │ framework 가 읽어서
                     │ Proto: https │ (덮어쓰면 안 됨) │ {baseUrl}을 https로 조립
                     ▼             ▼              ▼
                  자동 처리    nginx.conf 의     application.yml:53
                             $client_proto      (수정 불필요)
```

가장 흔한 실수는 nginx에서 `proxy_set_header X-Forwarded-Proto $scheme;`을 쓰는 것입니다.
ALB→EC2 구간은 http라서 `$scheme`은 항상 `http`이고, 그러면 Spring이 카카오 `redirect_uri`를 `http://`로 만들어 콘솔 등록값과 어긋납니다.

`front/nginx.conf`는 이를 피하려고 `map`으로 처리합니다.

```nginx
map $http_x_forwarded_proto $client_proto {
    default     $scheme;                  # 헤더 없으면(로컬 직접 접속) 실제 스킴
    "~^https?$" $http_x_forwarded_proto;  # ALB가 준 값이 있으면 그것을 사용
}
```

**애플리케이션 코드는 수정할 필요가 없습니다.** 필요한 설정이 이미 들어 있습니다.

| 설정 | 위치 | 역할 |
|---|---|---|
| `forward-headers-strategy: framework` | `application.yml:53` | `X-Forwarded-*`를 읽어 `{baseUrl}`을 재구성 |
| `secure: ${SESSION_COOKIE_SECURE:false}` | `application.yml:60` | 쿠키 Secure 플래그를 환경변수로 전환 |
| `same-site: lax` | `application.yml:61` | 카카오 리다이렉트(top-level GET)에서 세션 유지 |

---

## 3. AWS 리소스 준비

### 3-1. ACM 인증서

**반드시 ALB와 같은 리전(`ap-northeast-2` 서울)에서 발급**해야 합니다. CloudFront용(`us-east-1`)과 헷갈리기 쉽습니다.

| 항목 | 값 |
|---|---|
| 리전 | ap-northeast-2 |
| 도메인 이름 | `ktb-ai-hackathon-team14.com` |
| 추가 이름 (선택) | `www.ktb-ai-hackathon-team14.com` |
| 검증 방법 | **DNS 검증** |

발급 화면에서 **"Route 53에서 레코드 생성"** 버튼을 누르면 검증 CNAME이 자동 등록됩니다. 상태가 `발급됨(Issued)`이 될 때까지 보통 몇 분 걸립니다.

### 3-2. 보안 그룹 2개

역할을 분리해야 합니다. EC2를 인터넷에 직접 열지 않는 것이 핵심입니다.

**`alb-sg`** (ALB에 부착)

| 방향 | 포트 | 소스 |
|---|---|---|
| 인바운드 | 80 | `0.0.0.0/0` |
| 인바운드 | 443 | `0.0.0.0/0` |

**`ec2-sg`** (EC2에 부착)

| 방향 | 포트 | 소스 |
|---|---|---|
| 인바운드 | 80 | **`alb-sg`** (IP가 아니라 보안 그룹을 지정) |
| 인바운드 | 22 | 내 IP만 |

> `5432`, `27017`, `8080`은 **어디에도 열지 마세요.** `compose.prod.yaml`이 이 포트들을 호스트에 바인딩하지 않으므로 애초에 열 필요가 없습니다.

### 3-3. 대상 그룹 (Target Group)

| 항목 | 값 |
|---|---|
| 대상 유형 | Instances |
| 프로토콜 / 포트 | HTTP / **80** |
| 상태 검사 경로 | **`/healthz`** |
| 성공 코드 | 200 |
| 정상 임계값 | 2 |
| 간격 | 30초 |

`/healthz`는 nginx가 백엔드의 `/actuator/health`로 프록시하는 경로라, **백엔드가 죽으면 ALB도 비정상으로 인식**합니다.

> 트레이드오프: EC2가 1대뿐이라 백엔드 장애 시 정적 페이지까지 503이 됩니다. 데모 중 화면만이라도 뜨는 편이 낫다면 상태 검사 경로를 `/`로 바꾸세요. 대신 백엔드 장애를 ALB가 알아채지 못합니다.

### 3-4. ALB

| 항목 | 값 |
|---|---|
| 유형 | Application Load Balancer |
| 체계 | **인터넷 경계(Internet-facing)** |
| IP 주소 유형 | IPv4 |
| 서브넷 | **서로 다른 AZ의 퍼블릭 서브넷 2개 이상** (ALB 필수 요건) |
| 보안 그룹 | `alb-sg` |

**리스너 2개**

| 리스너 | 동작 |
|---|---|
| HTTPS : 443 | ACM 인증서 선택 → 위 대상 그룹으로 **전달(Forward)** |
| HTTP : 80 | **HTTPS로 리디렉션** (301, 포트 443) |

**속성에서 유휴 시간 초과(Idle timeout)를 `180`초로 올리세요.** 기본값 60초로는 상담 SSE 스트림이 끊깁니다 (아래 6-3 참고).

### 3-5. Route53

기존에 EC2 IP를 가리키던 A 레코드가 있다면 **ALB Alias로 교체**해야 합니다.

| 항목 | 값 |
|---|---|
| 레코드 이름 | `ktb-ai-hackathon-team14.com` |
| 유형 | A |
| 별칭(Alias) | 예 |
| 대상 | Application Load Balancer → `ap-northeast-2` → 생성한 ALB |

`www`도 쓸 거라면 같은 방식으로 A(Alias) 레코드를 하나 더 만듭니다.

```bash
# 전환 확인 (ALB의 IP로 바뀌어야 한다. EC2 퍼블릭 IP가 나오면 아직 반영 전)
dig +short ktb-ai-hackathon-team14.com
```

---

## 4. EC2 준비

아래 명령은 전부 **SSH로 EC2에 접속한 뒤 그 서버의 bash에서** 실행합니다.

```bash
ssh -i <키페어>.pem ubuntu@<EC2 퍼블릭 IP>
```

**인스턴스**: t3.xlarge (4 vCPU / 16GB). 런타임 실측 사용량은 컨테이너 4개 합계 약 520MB라 넉넉합니다.
최소로 줄인다면 t3.medium(2 vCPU / 4GB)까지는 무난하고, t3.small(2GB)은 스왑을 붙이고
`.env`에서 메모리 한도를 낮춰야 합니다 (8-3 참고). Gradle·vite 빌드가 런타임보다 메모리를 더 씁니다.

**EBS**: **20GB 이상.** 기본 8GB로는 부족합니다 (prod 이미지 약 2.5GB + 빌드 캐시가 4GB 넘게 쌓임).

### Docker 설치 — Ubuntu

> `sudo apt install docker.io` 로 설치하지 마세요. **`docker compose` 플러그인이 딸려오지 않아**
> 이 프로젝트의 `docker compose -f a -f b` 명령이 동작하지 않습니다. 공식 저장소로 설치합니다.

```bash
# 1) 저장소 등록
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 2) 설치
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
                        docker-buildx-plugin docker-compose-plugin

# 3) 부팅 시 자동 시작 + sudo 없이 사용
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

간단히 가려면 공식 설치 스크립트도 있습니다 (위와 같은 것을 설치합니다).

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

**`usermod` 후에는 반드시 재접속하세요.** 그러지 않으면 계속 `permission denied`가 납니다.

```bash
exit            # 그리고 다시 ssh 접속
# 또는 현재 셸에서만 즉시 반영
newgrp docker
```

설치 확인:

```bash
docker --version           # Docker version 27.x 이상
docker compose version     # Docker Compose version v2.x  ← v2 여야 함
docker run --rm hello-world
```



### 스왑 (2GB 이하 인스턴스만)

Ubuntu EC2에는 스왑이 없습니다. 빌드 중 OOM이 난다면 추가하세요.

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 5. 배포

```bash
cd ~                       # /home/ubuntu
git clone https://github.com/KTB-4-AI-Hackathon/backend_team.git
cd backend_team
cp .env.prod.example .env
vi .env
```

`.env`를 이렇게 맞춥니다.

```bash
# ALB가 HTTPS로 받으므로 https. 브라우저가 실제로 치는 주소와 완전히 같아야 한다.
FRONTEND_BASE_URL=https://ktb-ai-hackathon-team14.com

# 브라우저↔ALB 구간이 https이므로 true.
SESSION_COOKIE_SECURE=true

# ALB가 TLS를 종료하므로 nginx는 HTTP 설정 그대로. nginx.tls.conf 아님!
NGINX_CONF=nginx.conf

KAKAO_CLIENT_ID=<카카오 REST API 키>
KAKAO_CLIENT_SECRET=<카카오 Client Secret>

# AI 연동. 아래 5-1 참고. 데모 전까지는 stub 으로 두어도 서비스는 뜬다.
AI_MODE=stub
AI_BASE_URL=http://localhost:8000
AI_SERVICE_TOKEN=replace-me

# 업로드 파일 저장 경로. 컨테이너 내부 경로이며 compose 가 볼륨으로 마운트한다.
# compose.prod.yaml 이 /app/data/uploads 로 덮어쓰므로 .env 값은 무시된다.
APP_STORAGE_ROOT=./data/uploads
```

### 5-1. AI 연동 값 — 실제로 무엇을 넣는가

| 변수 | 넣을 값 | 설명 |
|---|---|---|
| `AI_MODE` | **`stub`** 또는 **`http`** — 이 둘뿐 | 어느 구현체를 띄울지 고르는 스위치 |
| `AI_BASE_URL` | AI 서버의 **오리진만**. 예: `http://10.0.1.23:8000` | 경로(`/internal/v1`)는 코드가 붙이므로 **넣지 마세요** |
| `AI_SERVICE_TOKEN` | AI 팀에게 받은 **내부 서비스 토큰 문자열** | `Authorization: Bearer <값>` 으로 전송됩니다 |
| `APP_STORAGE_ROOT` | 배포에서는 **손대지 않아도 됩니다** | compose가 `/app/data/uploads`로 덮어씁니다 |

**`AI_MODE`는 정확히 두 값만 유효합니다.**

```
stub  →  StubAiAnalysisClient / StubChatAiClient   (기본값. 값이 없어도 이쪽)
http  →  HttpAiAnalysisClient / HttpChatAiClient   (실제 AI 서버 호출)
```

`@ConditionalOnProperty`로 빈을 고르기 때문에 **`live`, `prod`, `real` 같은 다른 값을 넣으면
어느 쪽 빈도 만들어지지 않아 백엔드가 기동에 실패합니다.** 오타도 마찬가지입니다.

**`AI_MODE=http`로 바꾸기 전 체크리스트**

`http`로 두면 백엔드가 아래 두 엔드포인트를 호출합니다 (`backend/docs/AI_INTERNAL_API_SPEC.md`).

```http
POST {AI_BASE_URL}/internal/v1/prqc-analyses        # 대화 분석
POST {AI_BASE_URL}/internal/v1/consultation-answers # 상담 답변
Authorization: Bearer {AI_SERVICE_TOKEN}
```

- `AI_BASE_URL`에 **끝 슬래시나 `/internal/v1`을 붙이지 마세요.** 코드가 `/internal/v1/...`을 이어 붙이므로 `//internal/v1/...`처럼 되어 404가 납니다.
- AI 서버가 **같은 VPC 안**이라면 사설 IP(`http://10.x.x.x:8000`)를 쓰고, 보안 그룹에서 EC2 → AI 서버 포트를 열어야 합니다. `localhost`는 백엔드 **컨테이너 자기 자신**을 가리키므로 절대 동작하지 않습니다.
- AI 서버가 별도 도메인에 있다면 `https://ai.example.com` 형태로 넣습니다.
- 호출 타임아웃은 `AI_TIMEOUT`(기본 `90s`)으로 조정합니다.

**stub으로 두면 어떻게 되나**

서비스는 정상적으로 뜨고 로그인·업로드·화면 이동까지 전부 동작하지만, 분석 점수와 상담 답변이
**미리 정해진 더미 값**으로 나옵니다. AI 서버가 준비되기 전까지는 `stub`으로 배포해도 됩니다.
전환은 `.env`만 고치고 재기동하면 됩니다.

```bash
vi .env          # AI_MODE=http, AI_BASE_URL, AI_SERVICE_TOKEN
dcp up -d backend
dcp logs -f backend
```

### 5-2. `APP_STORAGE_ROOT`

업로드된 카카오톡 대화 원문을 저장하는 **컨테이너 내부 경로**입니다.

- `compose.prod.yaml`이 `/app/data/uploads`로 덮어쓰고, 같은 경로에 named volume
  `relationship-temperature-uploads`를 마운트합니다. **`.env` 값은 컨테이너 실행 시 무시되므로 그대로 두면 됩니다.**
- `.env`의 `./data/uploads`는 컨테이너 없이 호스트에서 `./gradlew bootRun` 할 때만 쓰입니다.
- 원문 파일은 `RAW_CONVERSATION_RETENTION`(기본 24시간)이 지나면 매시 15분에 도는 정리 작업이 삭제합니다.
  AI 서버와 파일 시스템을 공유할 필요는 없습니다 — 대화 데이터는 HTTP 요청 본문으로 전달됩니다.

기동합니다.

```bash
docker compose -f compose.yaml -f compose.prod.yaml up -d --build
```

명령이 길어지니 별칭을 만들어 두면 편합니다.

```bash
echo "alias dcp='docker compose -f compose.yaml -f compose.prod.yaml'" >> ~/.bashrc
source ~/.bashrc
dcp ps
```

---

## 6. 카카오 개발자 콘솔

| 위치 | 값 |
|---|---|
| 앱 설정 > 플랫폼 > Web > 사이트 도메인 | `https://ktb-ai-hackathon-team14.com` |
| 제품 설정 > 카카오 로그인 | 활성화 **ON** |
| 제품 설정 > 카카오 로그인 > Redirect URI | `https://ktb-ai-hackathon-team14.com/api/v1/auth/kakao/callback` |
| 제품 설정 > 카카오 로그인 > 동의항목 | 닉네임, 프로필 사진 |

**경로의 `/api/v1`은 반드시 포함**해야 합니다. `SecurityConfig`의 `redirectionEndpoint`에 고정된 값입니다.

로컬 개발용 `http://localhost:5173/api/v1/auth/kakao/callback`도 함께 등록해 두면 양쪽에서 개발할 수 있습니다 (카카오는 Redirect URI를 여러 개 등록할 수 있습니다).

---

## 7. 배포 후 검증

순서대로 확인하세요. 앞이 실패하면 뒤는 볼 필요가 없습니다.

```bash
# 1) EC2 안에서 nginx가 뜨는가
dcp ps                        # 4개 전부 Up, backend 는 (healthy)
curl -s localhost/healthz     # {"status":"UP"}

# 2) ALB 대상 그룹이 healthy 인가
#    AWS 콘솔 → 대상 그룹 → 대상 탭에서 "healthy" 확인

# 3) DNS가 ALB를 가리키는가
dig +short ktb-ai-hackathon-team14.com

# 4) HTTPS가 열리는가
curl -I https://ktb-ai-hackathon-team14.com/

# 5) HTTP → HTTPS 리디렉션
curl -I http://ktb-ai-hackathon-team14.com/      # 301, Location: https://...

# 6) 스킴 전달 체인이 살아 있는가  ← 로그인 성패를 가르는 핵심
curl -s -o /dev/null -w '%{redirect_url}\n' \
  https://ktb-ai-hackathon-team14.com/oauth2/authorization/kakao
# → redirect_uri=https://ktb-ai-hackathon-team14.com/api/v1/auth/kakao/callback
#   여기가 http:// 로 나오면 100% KOE006 이 납니다.

# 7) 세션 쿠키에 Secure 가 붙는가
curl -sI https://ktb-ai-hackathon-team14.com/oauth2/authorization/kakao | grep -i set-cookie
# → rt_session=...; Path=/; Secure; HttpOnly; SameSite=Lax

# 8) 브라우저로 실제 로그인
```

---

## 8. 주의사항

### 8-1. `-f compose.prod.yaml`을 빼먹으면 DB가 인터넷에 열립니다

가장 위험한 실수입니다. 서버에서 `docker compose up -d`만 치면 개발용 설정이 적용돼 **postgres 5432와 mongo 27017이 `0.0.0.0`에 바인딩**됩니다. 계정이 `relationship_temperature`/`relationship_temperature`라 그대로 털립니다.

`ec2-sg`가 80만 열어두면 외부에서는 막히지만, 보안 그룹 하나만 잘못 건드려도 즉시 노출됩니다. 배포 서버에서는 **항상** 두 파일을 다 지정하세요.

### 8-2. 스택을 전환할 때는 `--build`를 붙이세요

`front`는 같은 Dockerfile에서 두 가지로 빌드됩니다 — dev는 vite 개발 서버, prod는 nginx.
`compose.prod.yaml`이 prod 빌드에 `relationship-temperature-front:prod` 전용 태그를 붙여 구분하지만,
Dockerfile이나 nginx 설정을 고친 뒤에는 `--build` 없이 올리면 **예전 이미지가 그대로 뜹니다.**

```bash
dcp up -d --build        # 설정을 바꿨다면 항상 --build
```

떠 있는 것이 nginx가 맞는지 확인하는 방법:

```bash
docker inspect relationship-temperature-front-1 --format '{{.Config.Cmd}}'
# → [nginx -g daemon off;]   가 나와야 정상
# → [npm run dev ...]        가 나오면 개발용 이미지가 떠 있는 것
```

### 8-3. 백엔드 메모리 제한은 선택이 아닙니다

`backend/Dockerfile`의 JVM 옵션이 `-XX:MaxRAMPercentage=75`입니다. 컨테이너에 `mem_limit`이 없으면 **호스트 전체 RAM의 75%**를 힙 상한으로 잡아, Mongo·Postgres가 OOM으로 죽습니다.

`compose.prod.yaml`에 제한이 들어 있습니다. 적용 여부는 이렇게 확인합니다.

```bash
dcp exec backend java -XX:MaxRAMPercentage=75 -XX:+PrintFlagsFinal -version | grep MaxRAM
#   MaxRAM = 1572864000   ← 호스트 RAM이 아니라 mem_limit 값이어야 정상
```

t3.small(2GB)이면 `.env`에서 낮추세요.

```
BACKEND_MEM=900m
MONGO_MEM=600m
POSTGRES_MEM=256m
FRONT_MEM=64m
```

### 8-4. ALB 유휴 시간 초과를 180초로 올리세요

상담 화면은 `GET /api/v1/consultations/{id}/events` **SSE 스트림**을 씁니다.

- `SseEmitter` 타임아웃이 **120초**인데 ALB 기본 유휴 시간은 60초입니다. 그대로 두면 AI 응답이 늦을 때 ALB가 먼저 연결을 끊어 스트림이 죽습니다.
- 주기적 heartbeat가 없고 구독 직후 1회만 보내므로, 조용한 구간이 60초를 넘길 수 있습니다.

nginx 쪽은 이미 처리돼 있습니다 — SSE 경로만 따로 `proxy_buffering off`, `proxy_read_timeout 180s`를 겁니다. 이게 없으면 delta 이벤트가 nginx 버퍼에 갇혀 **화면이 멈춘 것처럼** 보입니다.

### 8-5. 오리진 3종은 반드시 일치해야 합니다

| 값 | 위치 | 규칙 |
|---|---|---|
| `FRONTEND_BASE_URL` | 서버 `.env` | 브라우저가 실제로 치는 주소와 **완전히** 동일 |
| 카카오 Redirect URI | 카카오 콘솔 | `{FRONTEND_BASE_URL}/api/v1/auth/kakao/callback` |
| `SESSION_COOKIE_SECURE` | 서버 `.env` | https면 `true` |

- `FRONTEND_BASE_URL`이 틀리면 로그인 성공 후 엉뚱한 주소로 튕깁니다. `OAuthRedirectUriValidator`가 scheme·host·port까지 same-origin 검사를 합니다.
- https인데 `SESSION_COOKIE_SECURE=false`로 두면 동작은 하지만 쿠키가 평문에도 실려 나갑니다. https면 `true`로 두세요.

### 8-6. 데이터는 named volume에 있습니다

```
relationship-temperature-postgres    앱 DB + 세션 테이블
relationship-temperature-mongo       분석 원문
relationship-temperature-uploads     업로드 파일
```

- **`down -v`는 전부 삭제합니다.** 운영에서 절대 쓰지 마세요. 정지는 `down`으로 충분합니다.
- `up -d --build`로 컨테이너를 갈아끼워도 볼륨은 유지됩니다.
- 세션이 `spring_session` 테이블(JDBC)에 저장되므로 **백엔드를 재시작해도 로그인이 유지**됩니다. 나중에 EC2를 늘려도 sticky session이 필요 없습니다. 다만 postgres 볼륨을 날리면 전원 로그아웃됩니다.

### 8-7. Flyway 마이그레이션은 자동이고, 롤백이 없습니다

컨테이너가 뜰 때 `db/migration`의 SQL이 순서대로 적용됩니다. `ddl-auto: validate`라서 엔티티와 스키마가 어긋나면 **기동 자체가 실패**하고, 백엔드가 계속 재시작합니다.

- 배포 전 백업을 먼저 받으세요.
- 실패하면 `dcp logs backend`에서 Flyway 에러를 확인합니다.

```bash
dcp exec -T postgres pg_dump -U relationship_temperature relationship_temperature > backup_$(date +%F).sql
```

### 8-8. `.env`는 서버에서 직접 만듭니다

`.gitignore`에 있어서 clone해도 따라오지 않습니다.

> **지금 저장소의 `.env.example`에 실제 카카오 REST API 키와 Client Secret이 커밋돼 있습니다.** 노출된 값으로 보고 콘솔에서 재발급한 뒤, `.env.example`은 placeholder로 바꾸세요.

### 8-9. 디스크가 조용히 찹니다

- 배포를 반복하면 빌드 캐시가 쌓입니다. `docker builder prune -f`를 주기적으로 돌리세요.
- 컨테이너 로그(json-file)는 기본 설정으로 무한히 커집니다. `/etc/docker/daemon.json`에 로테이션을 걸어두세요.

```json
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
```

### 8-10. 그 밖에

- **재부팅**: 서비스는 `restart: unless-stopped`라 자동 복구되지만, `systemctl enable docker`가 안 돼 있으면 도커 자체가 안 뜹니다.
- **시간대**: backend 컨테이너는 `TZ=Asia/Seoul`입니다. 업로드 파일 보존 정책(`RAW_CONVERSATION_RETENTION=24h`)과 정리 cron(매시 15분)이 이 기준으로 돕니다.
- **AI 연동**: `AI_MODE=stub`이면 실제 분석이 아니라 더미 응답입니다.
- **무중단 배포가 아닙니다**: `up -d --build`는 컨테이너를 교체하므로 수십 초 다운타임이 있습니다.

---

## 9. 운영 명령어

```bash
dcp logs -f backend               # 로그
dcp ps                            # 상태
dcp restart backend               # 단일 서비스 재시작
dcp exec postgres psql -U relationship_temperature -d relationship_temperature
dcp down                          # 정지 (데이터 유지)

git pull && dcp up -d --build     # 코드 업데이트
```

---

## 10. 트러블슈팅

| 증상 | 원인 / 해결 |
|---|---|
| `sudo: 'dnf': command not found` | 인스턴스가 Ubuntu입니다. `dnf`가 아니라 `apt`를 쓰세요 (4장) |
| `docker: 'compose' is not a docker command` | Compose v2 플러그인이 없습니다. `apt install docker.io`로 깔았다면 지우고 공식 저장소로 재설치하세요 (4장) |
| `permission denied ... /var/run/docker.sock` | `usermod -aG docker $USER` 후 재접속하지 않았습니다. `exit` 후 다시 ssh 하거나 `newgrp docker` |
| `docker: command not found` | 설치 실패 또는 `systemctl enable --now docker` 누락. `sudo systemctl status docker` |
| ALB 대상이 계속 `unhealthy` | `ec2-sg` 인바운드 80이 `alb-sg`로 열려 있는지, `curl localhost/healthz`가 200인지 확인 |
| `502 Bad Gateway` | 백엔드가 아직 기동 중이거나 죽음. `dcp ps`, `dcp logs backend` |
| `504 Gateway Timeout` (상담 화면) | ALB 유휴 시간 초과가 60초. 180초로 올리세요 (8-4) |
| 상담 답변이 안 나오고 멈춤 | SSE 버퍼링. `dcp exec front nginx -T \| grep proxy_buffering`로 `off` 확인 |
| `KOE006` | Redirect URI 불일치. 검증 6번을 돌려 `redirect_uri`가 `https://`이고 `/api/v1`이 있는지 확인 |
| `KOE101` | REST API 키가 아닌 다른 키(JavaScript 키 등)를 넣었거나 오타 |
| `KOE004` | 콘솔에서 카카오 로그인이 비활성 |
| 로그인이 무한 반복 | 세션 쿠키가 저장되지 않는 상태. `SESSION_COOKIE_SECURE`와 실제 스킴이 어긋났는지 확인 |
| 로그인 후 localhost로 튕김 | `FRONTEND_BASE_URL`이 아직 localhost |
| 백엔드가 재시작 반복 | Flyway 마이그레이션 실패 가능성. `dcp logs backend` |
| ACM 인증서가 ALB 목록에 없음 | 인증서 리전이 `ap-northeast-2`가 아니거나 아직 `발급됨` 상태가 아님 |
