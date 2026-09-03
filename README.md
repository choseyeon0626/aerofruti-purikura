# 🫧 Aerofruti Purikura Studio (에어로 푸르티거 프리쿠라 부스)

2000년대 중반 Windows Vista / Mac OS X Aqua 스타일의 **Frutiger Aero** 감성(광택 유리 질감, 깊은 그림자 버튼)과 **프리쿠라(Purikura)** 스티커 사진기를 결합한 풀스택 웹 애플리케이션입니다.

---

## 📁 Git Repository 구조

```text
aerofruti-purikura/
├── .gitignore             # Git 제외 파일 설정 (node_modules, .env 등)
├── README.md              # 프로젝트 매뉴얼
├── backend/               # 백엔드 (Node.js + Express + Nodemailer)
│   ├── package.json       # 백엔드 의존성
│   ├── server.js          # 사진 수신 및 메일 발송 API
│   └── .env.example       # 메일 환경변수 설정 예시
└── frontend/              # 프론트엔드 (Pure HTML5 + CSS3 + Fabric.js)
    ├── index.html         # 에어로 윈도우 UI & 4단계 플로우
    ├── styles.css         # 젤리 광택 버튼 & 글래스모피즘
    └── app.js             # 4컷 연속 촬영 및 스티커 꾸미기 로직
```

---

## 🐙 Git 커밋 및 GitHub 푸시 방법 (초간단 가이드)

압축을 푼 뒤 폴더 안에서 터미널을 열고 다음 4줄만 입력하면 GitHub에 바로 업로드됩니다:

```bash
# 1. 압축을 푼 aerofruti-purikura 폴더로 이동
cd aerofruti-purikura

# 2. Git 저장소 초기화 및 첫 커밋 생성
git init
git add .
git commit -m "feat: Initial commit of Frutiger Aero Purikura Photo Booth"

# 3. GitHub 원격 저장소 연결 및 푸시
git branch -M main
git remote add origin https://github.com/<당신의_깃허브_아이디>/<저장소_이름>.git
git push -u origin main
```

---

## 🚀 로컬 실행 방법

### 1. 백엔드 실행 (이메일 발송 서버)
```bash
cd backend
npm install
npm start
```
* 서버 주소: `http://localhost:5000`
* SMTP 계정을 입력하지 않아도 Ethereal 테스트 메일 URL이 터미널에 자동 생성되어 즉시 확인 가능합니다.

### 2. 프론트엔드 실행 (카메라 & 스티커 부스)
```bash
cd frontend
# npx serve 사용 시:
npx serve .
# 또는 Python 서버 사용 시:
python3 -m http.server 3000
```
브라우저에서 `http://localhost:3000`에 접속하여 카메라 권한을 승인하면 바로 이용할 수 있습니다.
