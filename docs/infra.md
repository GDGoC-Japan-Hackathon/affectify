# Infra

## Purpose

このドキュメントは GCP / Terraform / CI/CD の全体方針をまとめる。

## Main Components

- Artifact Registry
- Cloud Run
- Cloud SQL for PostgreSQL
- Secret Manager
- GitHub Actions
- Workload Identity Federation
- Terraform

## Recommended Architecture

- frontend
  Firebase App Hosting を第一候補にする
- backend
  Cloud Run
- database
  Cloud SQL for PostgreSQL
- auth
  Firebase Authentication
- container registry
  Artifact Registry
- secrets
  Secret Manager

## Terraform Scope

`infra/terraform` で主に次を管理する。

- GCP API の有効化
- Artifact Registry
- Cloud SQL
- Cloud Run
- Secret Manager
- GitHub Actions 用 WIF

## Terraform Operation

基本方針:

- `plan` を PR で確認する
- `apply` は GitHub Actions から行う
- state は GCS backend に置く
- 秘密値は Git 管理しない

### GCS Backend

state は GCS backend に置く。

理由:

- ローカルと GitHub Actions が同じ state を見られる
- local state のズレを避けられる
- `plan` と `apply` の結果を揃えやすい

初回は state 用 bucket を手で作る。

```bash
gcloud storage buckets create gs://YOUR_TERRAFORM_STATE_BUCKET \
  --project=YOUR_PROJECT_ID \
  --location=asia-northeast1 \
  --uniform-bucket-level-access
```

```bash
gcloud storage buckets update gs://YOUR_TERRAFORM_STATE_BUCKET \
  --versioning
```

その後 `backend.tf` の `backend "gcs"` を有効化し、`terraform init -migrate-state` で移行する。

## Cloud Run Bootstrap

Cloud Run は初回作成時に実在する image を必要とする。
そのため初回だけは、先に Artifact Registry へ image を push してから Terraform を適用する。

```bash
cd /Users/siraiyuto/Projects/affectify/proto
buf generate --template buf.gen.go.yaml

cd /Users/siraiyuto/Projects/affectify/backend
GIT_SHA=$(git rev-parse --short HEAD)
docker buildx build \
  --platform linux/amd64 \
  -t asia-northeast1-docker.pkg.dev/YOUR_PROJECT_ID/whitecoder-backend/backend:${GIT_SHA} \
  --push \
  .
```

Apple Silicon の Mac では `docker buildx build --platform linux/amd64 --push` を使う。

## Image Tag Policy

固定タグではなく `git sha` を使う。

例:

```bash
GIT_SHA=$(git rev-parse --short HEAD)
terraform apply -var="backend_image_tag=${GIT_SHA}"
```

これで防げること:

- 古い image の誤再利用
- `dev` / `latest` の上書き事故
- どの commit が動いているか追えない状態
- rollback 先が曖昧になること

## CI/CD

役割分担:

- CI
  PR で build / test / lint / `terraform plan`
- CD
  `develop` push で image build、migration、deploy

現在の想定 workflow:

- `ci.yml`
- `terraform-plan.yml`
- `deploy-dev.yml`

## Worker Execution Model

重い非同期処理は Cloud Run API サービスに抱え込まず、Cloud Run Jobs で実行する。

役割分担:

- Cloud Run API
  - 認証
  - 入力検証
  - job レコード作成
  - GCS upload session 発行
  - job 状態取得

- Cloud Run Jobs
  - `graph_build_jobs`
  - `layout_jobs`
  - `review_jobs`

dev 環境では Terraform で最低限次を作る:

- `whitecoder-backend`
  - Connect RPC を受ける Cloud Run service
- `whitecoder-graph-build`
  - graph build worker 用 Cloud Run Job
- `whitecoder-review`
  - review worker 用 Cloud Run Job
- `whitecoder-variant-sources-*`
  - variant のコード実体を置く GCS bucket

基本フロー:

1. frontend が API を呼ぶ
2. API が DB に job を作る
3. API が Cloud Run Job を起動する
4. worker が job を処理して DB の status を更新する

最初は polling 前提で十分とする。

## Worker Runtime Notes

- backend API と worker job は同じ Artifact Registry image を使ってよい
- 起動時の role は引数で切り替える
  - 例: `/app/worker graph-build`
  - 例: `/app/worker review`
- backend service account には Cloud Run Job 実行権限を与える
- worker service account には少なくとも次が必要
  - Cloud SQL 接続
  - Secret Manager 読取
  - variant source bucket の object 読書き

## GitHub Actions Secrets

最低限必要な Secrets:

- `DEV_CLOUD_SQL_USER_PASSWORD`
- `DEV_FIREBASE_ADMIN_CREDENTIALS_JSON`

## Firebase Admin Key Rotation

Firebase Admin SDK の JSON キーをローテーションしたら、Cloud Run が参照する Secret Manager の中身も更新する。

```bash
cd /Users/siraiyuto/Projects/affectify/infra/terraform/envs/dev
jq -Rs '{firebase_admin_credentials_json: .}' /Users/siraiyuto/Projects/affectify/backend/<new-file>.json > secrets.auto.tfvars.json
terraform plan -var="backend_image_tag=${GIT_SHA}"
terraform apply -var="backend_image_tag=${GIT_SHA}"
```

`secrets.auto.tfvars.json` は Git に載せない。
