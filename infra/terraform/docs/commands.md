# Terraform コマンドガイド

Terraform の初回導入、日常的な確認、`plan` / `apply` の意味をまとめたメモです。

## 実行場所

Terraform は `dev` 環境を対象にするとき、次のディレクトリで実行します。

```bash
cd /Users/siraiyuto/Projects/affectify/infra/terraform/envs/dev
```

`prod` を作る場合は、同じ要領で `envs/prod` に移動します。

## 事前準備

必要なもの:

- Terraform CLI
- GCP へアクセスできる認証
- `terraform.tfvars`

このリポジトリでは最低限、次のファイルが埋まっている前提です。

```text
infra/terraform/envs/dev/terraform.tfvars
```

## Terraform CLI の導入

Homebrew を使う場合:

```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

確認:

```bash
terraform version
```

## 認証

ローカルで `plan` を試すときは、先に GCP へログインしておく必要があります。

```bash
gcloud auth application-default login
```

必要に応じて project も合わせます。

```bash
gcloud config set project YOUR_PROJECT_ID
```

Application Default Credentials の quota project も合わせておくと、Terraform 実行時の warning を減らせます。

```bash
gcloud auth application-default set-quota-project YOUR_PROJECT_ID
```

`gcloud` コマンド自体の認証が切れている場合は、こちらも実行します。

```bash
gcloud auth login YOUR_ACCOUNT@gmail.com
gcloud config set account YOUR_ACCOUNT@gmail.com
```

## コマンドの意味

### `terraform init`

Terraform がこのディレクトリで動けるように初期化します。

やること:

- provider をダウンロードする
- backend 設定を初期化する
- `.terraform/` を作る

実行例:

```bash
terraform init
```

使うタイミング:

- 最初の1回
- provider を変更したとき
- backend 設定を変えたとき

### `terraform fmt`

Terraform ファイルを整形します。

```bash
terraform fmt -recursive
```

使うタイミング:

- `.tf` を編集したあと
- PR 前

### `terraform validate`

Terraform の構文や参照関係が正しいかを確認します。

```bash
terraform validate
```

使うタイミング:

- `init` のあと
- `plan` の前

### `terraform plan`

今の設定を適用したら何が作られるか、何が変わるかを表示します。

```bash
terraform plan
```

見ているもの:

- 追加されるリソース
- 更新されるリソース
- 削除されるリソース

使うタイミング:

- 変更内容を確認したいとき
- PR でレビューしたいとき
- `apply` 前の最終確認

### `terraform apply`

`plan` の内容を実際に GCP へ適用します。


```bash
terraform apply
```

注意:

- このプロジェクトでは原則 CI から実行する
- ローカルでは検証用途を除いて多用しない
- GCP API を Terraform で初回有効化する場合、伝播待ちのため 1 回目の `apply` 後に数分待って再実行が必要になることがある

### `terraform output`

Terraform が返している output を確認します。

```bash
terraform output
```

特定の output だけ見る場合:

```bash
terraform output cloud_run_service_url
```

### `terraform destroy`

その環境で Terraform が管理しているリソースを削除します。

```bash
terraform destroy
```

注意:

- 破壊的操作なので通常運用では使わない
- `prod` では特に慎重に扱う

## GCS backend へ移す

CI で Terraform を実行する前に、local state を GCS backend へ移す。

### なぜ必要か

- local state のままだと、GitHub Actions が同じ state を見られない
- ローカルでは作成済みでも、CI からは未作成に見えて差分が狂う
- state を 1 箇所に寄せることで、`plan` と `apply` の結果を揃えやすくなる

### 1. state 用 bucket を作る

```bash
gcloud storage buckets create gs://YOUR_TERRAFORM_STATE_BUCKET \
  --project=YOUR_PROJECT_ID \
  --location=asia-northeast1 \
  --uniform-bucket-level-access
```

バージョニングも有効にしておく。

```bash
gcloud storage buckets update gs://YOUR_TERRAFORM_STATE_BUCKET \
  --versioning
```

### 2. `backend.tf` の GCS backend を有効にする

`infra/terraform/envs/dev/backend.tf` のコメントを外して、bucket 名を入れる。

```hcl
backend "gcs" {
  bucket = "YOUR_TERRAFORM_STATE_BUCKET"
  prefix = "whitecoder/dev"
}
```

### 3. state を移行する

```bash
cd /Users/siraiyuto/Projects/affectify/infra/terraform/envs/dev
terraform init -migrate-state
```

このとき、今ある local state を GCS へ移してよいか聞かれるので `yes` を選ぶ。

### 4. 移行後の確認

```bash
terraform plan -var="backend_image_tag=${GIT_SHA}"
```

ここで不要な大量差分が出なければ、backend 移行は成功している。

### 補足

- backend 設定を変えた直後は `terraform init` ではなく `terraform init -migrate-state` か `terraform init -reconfigure` を使う
- `prod` を作るときは `prefix = "whitecoder/prod"` のように分ける
- state bucket 自体は GitHub に置かず、GCS の IAM で守る

## このプロジェクトで最初にやる流れ

1. `dev` ディレクトリへ移動する

```bash
cd /Users/siraiyuto/Projects/affectify/infra/terraform/envs/dev
```

2. `terraform.tfvars` があることを確認する

3. 初期化する

```bash
terraform init
```

4. 構文確認する

```bash
terraform validate
```

5. 差分確認する

```bash
terraform plan
```

## Cloud Run 初回 bootstrap

Cloud Run は作成時に実在する container image を必要とする。
そのため、`dev` / `prod` を問わず初回だけは Artifact Registry に image を先に置いてから `terraform apply` する。

### 1. Artifact Registry を先に作る

Terraform で Artifact Registry まで作成できていることを確認する。
少なくとも次が作成済みである必要がある。

- `artifactregistry.googleapis.com`
- Artifact Registry repository

### 2. Docker の認証

```bash
gcloud auth configure-docker asia-northeast1-docker.pkg.dev
```

### 3. backend image を build する

Docker image の build 前に、必ず protobuf 生成コードを更新する。
このリポジトリの Docker build は `backend/` を context にしているため、`proto/` をコミットしているだけでは足りず、`backend/gen/` がローカルに生成されている必要がある。

```bash
cd /Users/siraiyuto/Projects/affectify/proto
buf generate
```

```bash
cd /Users/siraiyuto/Projects/affectify/backend
GIT_SHA=$(git rev-parse --short HEAD)
docker buildx build \
  --platform linux/amd64 \
  -t asia-northeast1-docker.pkg.dev/YOUR_PROJECT_ID/whitecoder-backend/backend:${GIT_SHA} \
  --push \
  .
```

`prod` の初回 bootstrap でも考え方は同じで、固定タグではなく `git sha` のような immutable tag を使う。

Apple Silicon の Mac で通常の `docker build` を使うと、Cloud Run が受け付けないアーキテクチャの image になることがある。
Cloud Run 向けには `docker buildx build --platform linux/amd64 --push` を使う。

### 4. Artifact Registry に push する

`--push` を付けて build しているので、この時点では別途 `docker push` は不要。

`cloud_sql_user_password` は Cloud SQL のアプリ用ユーザー `whitecoder_app` のパスワードに使われ、同じ値が Secret Manager の `db-password` にも入る。
`firebase_admin_credentials_json` は Secret Manager の `firebase-admin-credentials` に入る。

## Firebase Admin キーを差し替えるとき

Firebase Admin SDK の JSON キーをローテーションした場合は、Cloud Run が参照する
Secret Manager の中身も更新する必要がある。

このプロジェクトでは、`firebase_admin_credentials_json` を
`secrets.auto.tfvars.json` から Terraform へ渡している。

### 1. `secrets.auto.tfvars.json` を作り直す

```bash
cd /Users/siraiyuto/Projects/affectify/infra/terraform/envs/dev
jq -Rs '{firebase_admin_credentials_json: .}' /Users/siraiyuto/Projects/affectify/backend/<new-file>.json > secrets.auto.tfvars.json
```

### 2. 差分確認する

```bash
terraform plan -var="backend_image_tag=${GIT_SHA}"
```

### 3. 適用する

```bash
terraform apply -var="backend_image_tag=${GIT_SHA}"
```

### 補足

- `secrets.auto.tfvars.json` は Git に載せない
- ローカル開発で `FIREBASE_CREDENTIALS_FILE` を使っている場合は、
  `backend/.env` のファイルパスも新しい JSON に合わせて更新する

この 2 つの値は将来的には GitHub Secrets から Terraform へ渡す前提にする。

### 5. Terraform を再度適用する

```bash
cd /Users/siraiyuto/Projects/affectify/infra/terraform/envs/dev
terraform plan
terraform apply -var="backend_image_tag=${GIT_SHA}"
```

## なぜ初回だけ必要か

- Cloud Run は image が存在しないとサービスを作れない
- Terraform は Cloud Run の設定だけを先に作ることができない
- 一度 image が Registry に入れば、その後は CI/CD で `build -> push -> deploy` に乗せられる

つまり、面倒なのは初回の bootstrap だけで、通常運用では毎回この手順を踏む必要はない。

## Image tag 運用

このプロジェクトでは Cloud Run に渡す image tag として、固定タグより `git sha` を推奨する。

例:

```bash
GIT_SHA=$(git rev-parse --short HEAD)
```

Terraform 側では `backend_image_tag` を受け取り、Cloud Run はその tag の image を参照する。

```bash
terraform apply -var="backend_image_tag=${GIT_SHA}"
```

### これで防げること

- 前回 push した古い image を誤って再利用すること
- `dev` や `latest` のような固定タグの上書き事故
- どの commit が Cloud Run で動いているか追えない状態
- rollback 時に戻す先が曖昧になること

### 生成コードに関する注意

- `proto/` をコミットしていても、現在の Docker build では自動生成されない
- `backend/gen/` は `buf generate` を実行したローカル生成物がそのまま image に入る
- そのため手動 build でも CI build でも、Docker build 前に `buf generate` が必要

### dev と prod の関係

- `dev` と `prod` は GCP 環境としては別のまま
- 同じ `git sha` の image を `dev` にも `prod` にも deploy できる
- 環境差分は image ではなく Cloud Run / Secret / Cloud SQL 側で管理する

## GitHub Actions で使う Secrets

`terraform-plan` と `deploy-dev` では、少なくとも次の GitHub Secrets が必要。

- `DEV_CLOUD_SQL_USER_PASSWORD`
- `DEV_FIREBASE_ADMIN_CREDENTIALS_JSON`

前者は Cloud SQL のアプリ用ユーザーパスワード、後者は Firebase Admin SDK の JSON 本文をそのまま入れる。

## よくある見方

`plan` でまず見るポイント:

- 本当に作りたいリソースだけが出ているか
- Cloud Run / Cloud SQL / Artifact Registry / Secret Manager / WIF が揃っているか
- 予期しない destroy がないか

## 注意点

- `variables.tf` は入力定義であって実値ではない
- 実値は `terraform.tfvars` に入れる
- `modules/` は再利用部品、`envs/dev` はその組み立て
- state を GCS backend に切り替えた後は、backend 設定変更時に `terraform init -reconfigure` が必要になることがある
