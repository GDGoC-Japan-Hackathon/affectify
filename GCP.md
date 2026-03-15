# GCP Deployment Plan

このドキュメントは、`affectify` を Google Cloud / Firebase 上にどのように配置するかをまとめたものです。

## Goal

- `frontend` は Next.js ベースの Web アプリとして配信する
- `backend` は Go API サーバとして運用する
- DB は PostgreSQL を使う
- 認証は Firebase Authentication を使う
- GitHub Actions から自動デプロイできるようにする
- DB schema は Atlas で migration 管理する

## Recommended Architecture

### Frontend

推奨: Firebase App Hosting

理由:

- Firebase 公式で Next.js をサポートしている
- GitHub 連携がある
- 実体は Google Cloud 上の Cloud Run / Cloud CDN / Cloud Build ベース
- Firebase Authentication との相性がよい

代替:

- Firebase Hosting + Cloud Run
- Cloud Run に frontend を直接載せる

ただし、このプロジェクトでは Next.js と Firebase Auth を使う前提なので、最初の候補は Firebase App Hosting でよいです。

### Backend

推奨: Cloud Run

理由:

- 既に `backend/Dockerfile` がある
- Go API サーバと相性がよい
- オートスケールする
- Artifact Registry との相性がよい
- GitHub Actions からの自動デプロイが容易

### Database

推奨: Cloud SQL for PostgreSQL

理由:

- ローカル開発でも PostgreSQL を使っている
- Cloud Run からの接続手順が標準化されている
- マネージド DB として運用しやすい

### Authentication

推奨: Firebase Authentication

理由:

- frontend でのログイン実装が早い
- Google ログイン等を使いやすい
- backend では Firebase ID token を検証すればよい
- `users.firebase_uid` と内部 `users.id` を対応付ける設計に合う

### Container Registry

推奨: Artifact Registry

理由:

- Cloud Run にそのままデプロイできる
- GitHub Actions から push しやすい

### Secrets

推奨: Secret Manager

用途:

- DB password
- Firebase Admin SDK の設定
- その他 backend 用の機密設定

### Logging / Monitoring

推奨:

- Cloud Logging
- Cloud Monitoring

必要に応じて:

- Error Reporting
- Cloud Trace

## CI/CD

推奨: GitHub Actions + Workload Identity Federation

理由:

- 長期鍵を GitHub Secrets に置かずに済む
- Google Cloud 公式でも GitHub Actions では Workload Identity Federation を推奨している
- `google-github-actions/auth` と `google-github-actions/deploy-cloudrun` が使える

### Recommended Flow

1. PR で既存 CI を実行
2. `backend` の `go build`, `go test`, `go run ./cmd/genorm`
3. Atlas migration の整合チェック
4. `main` への merge で backend image を build
5. Artifact Registry に push
6. Cloud Run Job で migration を apply
7. Cloud Run service を deploy
8. frontend は Firebase App Hosting 側で GitHub 連携デプロイ

## Database Migration Strategy

推奨: Atlas

このリポジトリでは次の流れを前提にする。

1. `internal/repository/entity` を更新する
2. `go run ./cmd/genorm` を実行する
3. `atlas migrate diff <name> --env local` を実行する
4. 生成された SQL をレビューする
5. `atlas migrate apply --env local` を実行する
6. 本番では Cloud Run Job または deploy pipeline から apply する

### Why Atlas

- GORM entity を source schema にできる
- migration ファイルは SQL として残る
- 差分生成を自動化できる
- CI/CD に組み込みやすい

## Environment Layout

最低でも次の 3 環境を分ける。

- `dev`
- `staging`
- `prod`

それぞれで分けるもの:

- Cloud Run service
- Cloud SQL instance
- Artifact Registry image tag
- Secret Manager secrets
- Firebase project または最低限 auth 設定

## Backend Runtime Settings

本番の backend は Cloud Run で動かす。

想定する設定:

- `PORT`: Cloud Run が注入するポートを使用
- `INSTANCE_CONNECTION_NAME`: Cloud SQL 接続用
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `GOOGLE_CLOUD_PROJECT`

Cloud SQL 接続は `/cloudsql/<INSTANCE_CONNECTION_NAME>` の Unix socket か、Cloud SQL connector 方針に寄せる。

## Frontend Runtime Settings

frontend が Firebase App Hosting の場合、主に必要なのは次です。

- backend API base URL
- Firebase project config
- public な client-side config

機密値は frontend に持ち込まない。

## Deployment Order

### First Setup

1. Google Cloud project 作成
2. Firebase project と接続
3. Artifact Registry 作成
4. Cloud SQL for PostgreSQL 作成
5. Cloud Run 用 service account 作成
6. Secret Manager 設定
7. Firebase Authentication 設定
8. GitHub Actions 用 Workload Identity Federation 設定
9. backend を初回 deploy
10. frontend を初回 deploy

### Normal Release

1. merge to `main`
2. GitHub Actions が認証
3. backend image build/push
4. migration apply
5. Cloud Run deploy
6. frontend deploy

## Suggested GCP Services Summary

- `frontend`: Firebase App Hosting
- `backend`: Cloud Run
- `database`: Cloud SQL for PostgreSQL
- `auth`: Firebase Authentication
- `container registry`: Artifact Registry
- `secrets`: Secret Manager
- `ci/cd auth`: Workload Identity Federation
- `logs/metrics`: Cloud Logging / Cloud Monitoring

## Notes

- `backend/compose.yml` は開発用 DB 起動専用
- 本番では Compose は使わない
- `backend/Dockerfile` は Cloud Run deploy 用として維持する
- migration は GORM `AutoMigrate` ではなく Atlas を正とする

## Official References

- Cloud Run docs: https://cloud.google.com/run/docs
- Cloud SQL from Cloud Run: https://docs.cloud.google.com/sql/docs/postgres/connect-run
- Artifact Registry and Cloud Run: https://cloud.google.com/artifact-registry/docs/integrate-cloud-run
- Firebase App Hosting: https://firebase.google.com/docs/app-hosting
- Next.js on Firebase: https://firebase.google.com/docs/hosting/frameworks/nextjs
- Firebase Hosting + Cloud Run: https://firebase.google.com/docs/hosting/cloud-run
- Workload Identity Federation with deployment pipelines: https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- Workload Identity Federation best practices: https://cloud.google.com/iam/docs/best-practices-for-using-workload-identity-federation
- `google-github-actions/auth`: https://github.com/google-github-actions/auth
- `google-github-actions/deploy-cloudrun`: https://github.com/google-github-actions/deploy-cloudrun
