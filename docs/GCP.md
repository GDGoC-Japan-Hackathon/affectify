# GCP Deployment Plan

このドキュメントは、`WhiteCoder` を Google Cloud / Firebase 上にどのように配置するかをまとめたものです。

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

## Terraform Strategy

推奨: GCP 基盤は Terraform で管理し、frontend の Firebase App Hosting は必要に応じて段階的に取り込む。

### Directory Layout

```text
infra/terraform/
  modules/
    artifact_registry/
    cloud_run/
    cloud_sql/
    github_wif/
    project_services/
    secret_manager/
  envs/
    dev/
    prod/
```

### Scope

最初に Terraform 管理へ入れる対象:

- GCP API の有効化
- Artifact Registry
- Cloud SQL for PostgreSQL
- Cloud Run
- Secret Manager
- GitHub Actions 用 Workload Identity Federation

後回しにする対象:

- Firebase App Hosting の詳細設定
- Firebase Console 上の細かな運用設定

### Practices

- `terraform plan` を PR で確認する
- `terraform apply` は GitHub Actions からのみ実行する
- state は GCS backend に置く
- 秘密値は Secret Manager を使い、`tfvars` に直接書かない
- `dev` と `prod` は `envs/` で分ける
- Cloud Run の公開設定は `allUsers` への Invoker 付与ではなく、Invoker IAM check の無効化を優先する
- DB ユーザーのパスワードと Secret Manager の値は同じ Terraform input から管理し、二重入力を避ける

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
DB ユーザーは `postgres` ではなく、アプリ専用ユーザーを Terraform で作成して使う。

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

#### Backend 初回 deploy の注意

Cloud Run は初回作成時に実在する container image を必要とする。
そのため backend の初回 deploy では、Cloud Run を作る前に Artifact Registry へ image を push しておく。

流れ:

1. Artifact Registry を作成する
2. backend image を build する
3. Artifact Registry に push する
4. Terraform / deploy で Cloud Run を作成する

この bootstrap は `dev` でも `prod` でも初回だけ必要。

#### Image tag 方針

Cloud Run が参照する image は固定タグではなく `git sha` のような immutable tag を使う。

これで防げること:

- 前の image を誤って使い続けること
- `dev` / `latest` の上書きによる取り違え
- どの commit が deploy 済みか追跡できない状態
- rollback 先の特定が難しくなること

`dev` と `prod` は GCP 環境として分離したまま、同じ image tag を別環境へ deploy できる。

#### Container image の注意

Cloud Run へ deploy する image は `linux/amd64` で build する。
Apple Silicon の Mac で通常の `docker build` を使うと、Cloud Run が受け付けない image になることがあるため、初回 bootstrap と手動検証では次を使う。

また、現在の Docker build は `backend/` を context にしているため、build 前に `buf generate` を実行して `backend/gen/` を生成しておく必要がある。

```bash
cd /Users/siraiyuto/Projects/affectify/proto
buf generate

cd /Users/siraiyuto/Projects/affectify/backend
GIT_SHA=$(git rev-parse --short HEAD)
docker buildx build \
  --platform linux/amd64 \
  -t asia-northeast1-docker.pkg.dev/YOUR_PROJECT_ID/whitecoder-backend/backend:${GIT_SHA} \
  --push \
  .
```

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
