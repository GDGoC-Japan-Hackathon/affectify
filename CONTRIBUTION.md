# Contribution Guide

## ブランチ戦略

```
main          ← 常に動く状態を維持（develop からマージ）
└── develop   ← 開発の統合ブランチ（PR のマージ先）
    └── feat/xxx  ← 機能ブランチ
```

- `main`: 本番相当。直接コミットしない
- `develop`: 開発用。feature ブランチからの PR をここにマージ

## 開発の流れ

1. `develop` から feature ブランチを作成
2. 実装
3. `develop` に向けて PR を作成
4. レビュー → マージ
5. 安定したら `develop` → `main` にマージ

※ Issue はメモ程度の位置付け。必ずしも立てなくてよい
