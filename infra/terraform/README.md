# Terraform

`infra/terraform` は GCP のインフラ構成を管理するためのディレクトリです。

## 方針

- 再利用したい構成は `modules/` に置く
- 環境ごとの差分は `envs/` に置く
- `terraform apply` は原則 CI からのみ実行する
- state は GCS backend を使う

## ディレクトリ構成

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

## 最初に管理する対象

- GCP API の有効化
- Artifact Registry
- Cloud SQL for PostgreSQL
- Cloud Run
- Secret Manager
- GitHub Actions 用 Workload Identity Federation

## 運用ルール

- `plan` を PR で確認する
- `apply` は merge 後の GitHub Actions で行う
- 秘密値は `tfvars` に直接書かず Secret Manager 側へ寄せる
- frontend は当面 Firebase App Hosting を別管理とし、backend と GCP 基盤を先に Terraform 化する

## 参考ドキュメント

- [Terraform コマンドガイド](./docs/commands.md)

## State Backend

初回は local state で動かし、`dev` が安定したら GCS backend へ移す。

移行後は、

- ローカル実行
- GitHub Actions

の両方が同じ state を参照できるようになる。
