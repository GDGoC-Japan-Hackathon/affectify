import type { FeedbackCard } from "@/types/ai-review";

export const mockOverallScore = 64;

export const mockSummary =
  "全体的な構造は把握できますが、循環依存・責務過多・設計書の不明確な定義が複数検出されました。設計書のルールを明文化した上で再評価することを推奨します。";

export const mockFeedbackCards: FeedbackCard[] = [
  // 設計書へのフィードバック
  {
    id: "dg-1",
    type: "design_guide",
    severity: "high",
    title: "依存方向のルールが未定義",
    description: "設計書に層間の依存方向が明記されていません。どの層がどの層に依存してよいか不明確です。",
    suggestion: "「domain層からinfrastructure層への依存を禁止する」などのルールを設計書に追記してください。",
    resolved: false,
    chatHistory: [],
  },
  {
    id: "dg-2",
    type: "design_guide",
    severity: "medium",
    title: "レイヤー定義が抽象的",
    description: "設計書にレイヤーの名称は記載されていますが、各レイヤーの責務範囲が曖昧です。",
    suggestion: "各レイヤーに「何を置いてよいか・何を置いてはいけないか」を具体例とともに記載してください。",
    resolved: false,
    chatHistory: [],
  },
  // コードへのフィードバック
  {
    id: "cf-1",
    type: "code",
    severity: "high",
    title: "循環依存の検出",
    description: "Parser → Analyzer → Parser の循環依存が検出されました。変更に非常に弱い構造です。",
    suggestion: "共通のインターフェースを定義し、循環を断ち切ってください。",
    filePaths: ["internal/parser/parser.go", "internal/analyzer/analyzer.go"],
    nodeIds: [
      "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.(Parser).Parse",
      "github.com/sirayu2525/google-hackathon/analyzer/internal/analyzer.(Analyzer).Analyze",
    ],
    edgeIds: [],
    resolved: false,
    chatHistory: [],
  },
  {
    id: "cf-2",
    type: "code",
    severity: "high",
    title: "神クラスの疑い",
    description: "Analyzerへの依存が集中しており、単一責任の原則に違反している可能性があります。",
    suggestion: "Analyzerの責務を分割し、より小さなサービスに分解することを検討してください。",
    filePaths: ["internal/analyzer/analyzer.go"],
    nodeIds: [
      "github.com/sirayu2525/google-hackathon/analyzer/internal/analyzer.(Analyzer).Analyze",
    ],
    edgeIds: [],
    resolved: false,
    chatHistory: [],
  },
  {
    id: "cf-3",
    type: "code",
    severity: "low",
    title: "命名規則の不統一",
    description: "一部のファイルでスネークケースとキャメルケースが混在しています。",
    suggestion: "プロジェクト全体でGo標準の命名規則（キャメルケース）に統一してください。",
    filePaths: ["internal/parser/parser.go"],
    nodeIds: [],
    edgeIds: [],
    resolved: false,
    chatHistory: [],
  },
];
