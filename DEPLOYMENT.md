# 배포 가이드

이 프로젝트를 배포하는 방법을 안내합니다.

## 방법 1: Vercel (추천 - 가장 쉬움)

### 1단계: GitHub에 코드 업로드
1. GitHub에 새 저장소를 만듭니다
2. 다음 명령어로 코드를 업로드합니다:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/사용자명/저장소명.git
git push -u origin main
```

### 2단계: Vercel에 배포
1. [Vercel](https://vercel.com)에 가입/로그인합니다
2. "Add New Project" 클릭
3. GitHub 저장소를 선택하고 "Import" 클릭
4. 프로젝트 설정:
   - **Framework Preset**: Vite
   - **Root Directory**: ./
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Environment Variables** 섹션에서 환경 변수 추가:
   - `GEMINI_API_KEY`: Gemini API 키 값
6. "Deploy" 클릭
7. 배포 완료 후 제공되는 URL로 접속 가능합니다!

### Vercel CLI로 배포 (선택사항)
```bash
npm i -g vercel
vercel login
vercel
```

---

## 방법 2: Netlify

### 1단계: GitHub에 코드 업로드
(방법 1과 동일)

### 2단계: Netlify에 배포
1. [Netlify](https://www.netlify.com)에 가입/로그인합니다
2. "Add new site" > "Import an existing project" 클릭
3. GitHub 저장소를 선택하고 "Import" 클릭
4. 빌드 설정:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. "Advanced" > "New variable" 클릭하여 환경 변수 추가:
   - `GEMINI_API_KEY`: Gemini API 키 값
6. "Deploy site" 클릭
7. 배포 완료 후 제공되는 URL로 접속 가능합니다!

### Netlify CLI로 배포 (선택사항)
```bash
npm i -g netlify-cli
netlify login
netlify deploy --prod
```

---

## 방법 3: GitHub Pages

### 1단계: vite.config.ts 수정
`vite.config.ts`에 base 경로를 추가해야 합니다:

```typescript
export default defineConfig({
  base: '/저장소명/', // GitHub 저장소 이름
  // ... 나머지 설정
})
```

### 2단계: GitHub Actions 설정
`.github/workflows/deploy.yml` 파일을 생성합니다:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
      
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### 3단계: GitHub Secrets 설정
1. GitHub 저장소 > Settings > Secrets and variables > Actions
2. "New repository secret" 클릭
3. Name: `GEMINI_API_KEY`, Value: API 키 값 입력

### 4단계: GitHub Pages 활성화
1. GitHub 저장소 > Settings > Pages
2. Source를 "GitHub Actions"로 선택
3. 코드를 push하면 자동으로 배포됩니다

---

## 환경 변수 설정 주의사항

모든 배포 플랫폼에서 `GEMINI_API_KEY` 환경 변수를 설정해야 합니다.

### Vercel
- Project Settings > Environment Variables에서 추가

### Netlify
- Site settings > Environment variables에서 추가

### GitHub Pages
- Repository Settings > Secrets and variables > Actions에서 추가

---

## 배포 후 확인사항

1. ✅ 웹사이트가 정상적으로 로드되는지 확인
2. ✅ 퀴즈가 정상적으로 작동하는지 확인
3. ✅ 맞춤형 해설 기능이 작동하는지 확인 (API 키 필요)
4. ✅ 로컬 스토리지가 정상 작동하는지 확인

---

## 문제 해결

### 빌드 오류가 발생하는 경우
```bash
npm run build
```
로컬에서 빌드를 테스트해보세요.

### API 키 관련 오류
- 환경 변수가 올바르게 설정되었는지 확인
- 변수 이름이 정확한지 확인 (`GEMINI_API_KEY`)

### 404 오류 (GitHub Pages)
- `vite.config.ts`의 `base` 경로가 올바른지 확인
- 저장소 이름과 일치해야 합니다

