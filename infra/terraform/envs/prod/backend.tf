terraform {
  required_version = ">= 1.7.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  # 初回は local backend のまま初期化し、GCS bucket 作成後に切り替える。
  backend "gcs" {
    bucket = "whitecoder-terraform-state"
    prefix = "whitecoder/prod"
  }
}
