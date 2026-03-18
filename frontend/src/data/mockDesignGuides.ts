import { DesignGuide } from '@/types/type';

export const mockDesignGuides: DesignGuide[] = [
  {
    id: 'guide-1',
    name: 'DDD設計ガイドライン',
    description: 'ドメイン駆動設計の原則に基づいた設計指針',
    createdBy: 'user-1',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-03-10'),
    content: `# DDD（ドメイン駆動設計）ガイドライン

## 基本原則

### 1. レイヤード アーキテクチャ
- **プレゼンテーション層**: UIとユーザーインタラクション
- **アプリケーション層**: ユースケースの調整
- **ドメイン層**: ビジネスロジックとルール
- **インフラストラクチャ層**: 外部システムとの連携

### 2. 戦術的設計パターン

#### エンティティ
- 一意の識別子を持つオブジェクト
- ライフサイクルを通じて同一性を保つ

#### 値オブジェクト
- 属性によってのみ定義される不変オブジェクト
- 等価性は属性の比較で判断

#### 集約
- 一貫性境界を定義
- 集約ルートを通じてのみアクセス可能

#### ドメインサービス
- エンティティや値オブジェクトに属さないドメインロジック

#### リポジトリ
- 集約の永続化と再構築を担当
- ドメイン層のインターフェース、インフラ層で実装

### 3. 依存関係のルール
✅ **許可される依存**
- プレゼンテーション → アプリケーション → ドメイン
- インフラストラクチャ → ドメイン（インターフェース実装のみ）

❌ **禁止される依存**
- ドメイン → インフラストラクチャ
- ドメイン → アプリケーション
- ドメイン → プレゼンテーション

### 4. 命名規則
- **エンティティ**: 名詞形（例: User, Order）
- **値オブジェクト**: 名詞形（例: Money, Email）
- **ドメインサービス**: 動詞+Service（例: PaymentService）
- **リポジトリ**: エンティティ名+Repository（例: UserRepository）

### 5. コード品質基準
- 循環依存の禁止
- 1関数あたりの複雑度: 10以下
- 1ファイルあたりの行数: 300行以内
- ドメインロジックのテストカバレッジ: 80%以上`,

    likeCount: 892,
  },
  {
    id: 'guide-2',
    name: 'Clean Architecture規約',
    description: 'Robert C. Martinのクリーンアーキテクチャに基づく設計原則',
    createdBy: 'user-2',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-03-12'),
    content: `# Clean Architecture規約

## 依存性の原則

### The Dependency Rule
**依存関係は外側から内側の方向のみ**

\`\`\`
Frameworks & Drivers (外側)
    ↓
Interface Adapters
    ↓
Application Business Rules
    ↓
Enterprise Business Rules (内側)
\`\`\`

## レイヤー定義

### 1. Enterprise Business Rules（エンタープライズビジネスルール）
- **Entities**: ビジネスの最も重要なルール
- フレームワーク非依存
- 外部の変更に影響を受けない

### 2. Application Business Rules（アプリケーションビジネスルール）
- **Use Cases**: アプリケーション固有のビジネスルール
- エンティティの流れを調整
- データベースやUIの詳細を知らない

### 3. Interface Adapters（インターフェースアダプター）
- **Controllers**: 外部からの入力を変換
- **Presenters**: 内部データを外部形式に変換
- **Gateways**: データベースアクセスの実装

### 4. Frameworks & Drivers（フレームワークとドライバー）
- **UI**: Webフレームワーク、モバイルフレームワーク
- **DB**: データベース実装
- **External**: 外部API、デバイスドライバー

## 設計原則

### SOLID原則の厳守
- **S**: Single Responsibility（単一責任）
- **O**: Open-Closed（開放閉鎖）
- **L**: Liskov Substitution（リスコフの置換）
- **I**: Interface Segregation（インターフェース分離）
- **D**: Dependency Inversion（依存性逆転）

### 境界の明確化
- レイヤー間の通信はインターフェースを介する
- DTOを使用してデータを渡す
- 具象クラスへの直接依存を避ける

## コーディング規約

### 命名規則
- Use Cases: \`動詞+名詞+UseCase\` (例: CreateUserUseCase)
- Repositories: \`名詞+Repository\` (例: UserRepository)
- DTOs: \`名詞+DTO\` (例: UserDTO)

### ファイル構成
\`\`\`
src/
  domain/          # Enterprise Business Rules
    entities/
    repositories/  # インターフェースのみ
  application/     # Application Business Rules
    use-cases/
    ports/
  infrastructure/  # Interface Adapters & Frameworks
    repositories/  # 実装
    api/
    ui/
\`\`\`

### 品質基準
- テスト駆動開発（TDD）の推奨
- ユニットテストカバレッジ: 80%以上
- 関数の行数: 20行以内を推奨
- クラスの責務: 単一責任に限定`,

    likeCount: 1247,
  },
  {
    id: 'guide-3',
    name: 'React ベストプラクティス',
    description: 'モダンなReactアプリケーション開発のガイドライン',
    createdBy: 'user-1',
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2024-03-14'),
    content: `# React ベストプラクティス

## コンポーネント設計

### 1. コンポーネントの分類
- **Presentational Components**: UIの見た目のみを担当
- **Container Components**: ロジックとデータ取得を担当
- **Custom Hooks**: 再利用可能なロジック

### 2. 単一責任の原則
- 1つのコンポーネントは1つの責務のみ
- 200行を超えたら分割を検討

### 3. Props設計
- 必須プロパティは明示的に定義
- デフォルト値の活用
- TypeScriptの型定義を必須とする

## 状態管理

### ローカル状態 vs グローバル状態
- **useState**: コンポーネント固有の状態
- **useContext**: ツリー全体で共有する状態
- **外部ライブラリ**: 複雑な状態管理（Redux, Zustand等）

### 状態の配置原則
- 状態は必要な最小のスコープに配置
- Props Drillingは3階層までが目安

## パフォーマンス最適化

### メモ化
- \`React.memo\`: プロップスが変わらない場合の再レンダリング防止
- \`useMemo\`: 計算結果のキャッシュ
- \`useCallback\`: 関数のメモ化

### 過度な最適化を避ける
- 測定してから最適化
- premature optimizationは避ける

## ファイル構成

\`\`\`
src/
  components/
    common/      # 汎用コンポーネント
    features/    # 機能別コンポーネント
  hooks/         # カスタムフック
  contexts/      # Contextプロバイダー
  utils/         # ユーティリティ関数
  types/         # 型定義
\`\`\`

## コーディング規約

### 命名規則
- コンポーネント: PascalCase
- hooks: use + PascalCase
- 定数: UPPER_SNAKE_CASE
- 変数・関数: camelCase

### 品質基準
- ESLintの警告ゼロ
- コンポーネントのテストカバレッジ: 70%以上
- アクセシビリティ（a11y）基準の遵守`,

    likeCount: 334,
  },
  {
    id: 'guide-4',
    name: 'マイクロサービス設計原則',
    description: 'スケーラブルなマイクロサービスアーキテクチャのガイドライン',
    createdBy: 'user-3',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-03-05'),
    content: `# マイクロサービス設計原則

## 基本原則

### 1. サービスの境界
- ビジネスケイパビリティに基づく分割
- 独立したデプロイ可能な単位
- 疎結合、高凝集

### 2. データ管理
- Database per Service パターン
- 各サービスが独自のデータストアを持つ
- データの共有はAPIを介して行う

### 3. 通信パターン
- **同期**: REST API, gRPC
- **非同期**: メッセージキュー、イベントストリーミング
- 適切なパターンを選択

## アーキテクチャパターン

### API Gateway
- クライアントの単一エントリポイント
- ルーティング、認証、レート制限

### Service Discovery
- 動的なサービス検出
- ヘルスチェックとロードバランシング

### Circuit Breaker
- 障害の伝播を防ぐ
- フォールバック戦略

## 設計ガイドライン

### サービスサイズ
- Two Pizza Team Rule（2枚のピザで足りるチーム）
- コードベース: 10,000行以内を目安

### API設計
- RESTful原則の遵守
- バージョニング戦略（URL、ヘッダー）
- OpenAPI仕様書の作成

### エラーハンドリング
- 適切なHTTPステータスコード
- 詳細なエラーメッセージ
- トレーサビリティの確保

## 運用とモニタリング

### ログ
- 構造化ログ（JSON形式）
- 相関ID（Correlation ID）の付与
- 集中ログ管理

### メトリクス
- ビジネスメトリクス
- アプリケーションメトリクス
- インフラメトリクス

### トレーシング
- 分散トレーシング
- レイテンシの可視化`,

    likeCount: 567,
  },
  {
    id: 'guide-5',
    name: '関数型プログラミング スタイルガイド',
    description: '関数型プログラミングの原則とベストプラクティス',
    createdBy: 'user-2',
    createdAt: new Date('2024-02-28'),
    updatedAt: new Date('2024-03-13'),
    content: `# 関数型プログラミング スタイルガイド

## コア原則

### 1. イミュータビリティ（不変性）
- データを変更しない
- 新しいデータを作成して返す
- 状態の共有を最小化

### 2. 純粋関数
- 同じ入力には常に同じ出力
- 副作用（Side Effects）を持たない
- テストが容易

### 3. 関数の合成
- 小さな関数を組み合わせる
- 高階関数の活用
- パイプライン処理

## 推奨パターン

### データ変換
\`\`\`typescript
// ❌ ミューテーション
const addItem = (array, item) => {
  array.push(item);
  return array;
};

// ✅ イミュータブル
const addItem = (array, item) => [...array, item];
\`\`\`

### 条件分岐
\`\`\`typescript
// ❌ if文の多用
function getPrice(user) {
  if (user.isPremium) {
    return user.basePrice * 0.8;
  } else {
    return user.basePrice;
  }
}

// ✅ 三項演算子またはパターンマッチング
const getPrice = (user) =>
  user.isPremium ? user.basePrice * 0.8 : user.basePrice;
\`\`\`

### エラーハンドリング
- Option/Maybe型の活用
- Either型によるエラー表現
- try-catchの代わりに関数型アプローチ

## 高階関数の活用

### map, filter, reduce
\`\`\`typescript
const users = [/* ... */];

// データ変換のパイプライン
const activeAdminEmails = users
  .filter(user => user.isActive)
  .filter(user => user.role === 'admin')
  .map(user => user.email);
\`\`\`

### カリー化
\`\`\`typescript
const multiply = (a) => (b) => a * b;
const double = multiply(2);
const result = double(5); // 10
\`\`\`

## 禁止事項

### ミューテーション
- \`push\`, \`pop\`, \`splice\`の使用禁止
- オブジェクトプロパティの直接変更禁止

### 副作用
- 関数内でのグローバル変数の変更禁止
- 関数内でのI/O操作は明示的に分離

### 循環依存
- モジュール間の循環参照禁止

## 品質基準
- 純粋関数の割合: 80%以上
- 関数の行数: 10行以内を推奨
- ネストの深さ: 3レベル以内`,

    likeCount: 421,
  },
];
