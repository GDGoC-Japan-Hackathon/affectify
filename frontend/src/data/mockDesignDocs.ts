import { AnalysisReport } from '@/types';

export const mockAnalysisReports: Record<string, AnalysisReport> = {
  'variant-1': {
    id: 'report-1',
    variantId: 'variant-1',
    overallScore: 85,
    analyzedAt: new Date('2024-03-14T10:30:00'),
    reportData: {
      overview: {
        summary: 'Eコマースプラットフォームのフロントエンド設計。React + TypeScriptを使用し、モジュラーアーキテクチャを採用。',
        purpose: 'スケーラブルで保守性の高いEコマースシステムの構築。',
        techStack: ['React 18', 'TypeScript', 'Redux Toolkit', 'React Query', 'TailwindCSS'],
      },
      architecture: {
        pattern: 'Feature-Based Architecture',
        description: '機能単位でコードを分割し、各機能が独立したモジュールとして動作。',
        strengths: [
          '機能単位での並行開発が容易',
          'コードの責任範囲が明確',
          '将来的なマイクロフロントエンド化が容易',
          'テストの分離が簡単',
        ],
        weaknesses: [
          '共通コンポーネントの管理が課題',
          '機能間の連携が複雑になる可能性',
          'ルーティングの設計が重要',
        ],
      },
      dependencies: {
        totalCount: 24,
        byType: { internal: 18, external: 6, circular: 2 },
        issues: [
          {
            type: 'circular',
            severity: 'high',
            description: 'ProductDetailコンポーネントとCartServiceの間に循環依存が検出されました',
            affectedNodes: ['ProductDetail', 'CartService', 'ProductService'],
          },
          {
            type: 'tight-coupling',
            severity: 'medium',
            description: 'CheckoutフローがPaymentServiceに強く依存しています',
            affectedNodes: ['CheckoutFlow', 'PaymentService'],
          },
        ],
      },
      codeQuality: {
        overallScore: 85,
        metrics: { maintainability: 88, complexity: 78, testability: 85, reusability: 89 },
      },
      recommendations: [
        {
          id: 'rec-1',
          priority: 'high',
          category: 'architecture',
          title: '循環依存の解消',
          description: 'ProductDetailとCartService間の循環依存を解消してください。イベントバスやPub/Subパターンの導入を推奨します。',
          impact: 'コードの保守性が向上し、バグの混入リスクが低減します',
          effort: 'medium',
        },
        {
          id: 'rec-2',
          priority: 'high',
          category: 'maintainability',
          title: 'CheckoutFlowコンポーネントの分割',
          description: 'CheckoutFlowコンポーネントが300行を超えており、複雑度が高くなっています。',
          impact: 'テスタビリティと可読性が大幅に向上します',
          effort: 'medium',
        },
        {
          id: 'rec-3',
          priority: 'medium',
          category: 'performance',
          title: 'ProductListのメモ化',
          description: 'ProductListコンポーネントで不要な再レンダリングが発生しています。',
          impact: 'リスト表示時のパフォーマンスが約30%改善します',
          effort: 'low',
        },
      ],
      risks: [
        {
          id: 'risk-1',
          severity: 'high',
          category: 'アーキテクチャ',
          title: '循環依存によるバグのリスク',
          description: 'ProductDetailとCartService間の循環依存により、予期しない動作が発生する可能性があります。',
          mitigation: '依存関係を再設計し、一方向の依存に変更してください。',
        },
        {
          id: 'risk-2',
          severity: 'medium',
          category: 'パフォーマンス',
          title: '大量の商品データでのパフォーマンス低下',
          description: 'ProductListで大量のデータを扱う際、仮想化が実装されていないため、パフォーマンスが低下する可能性があります。',
          mitigation: 'react-windowやreact-virtualizedを導入して、仮想スクロールを実装してください。',
        },
      ],
    },
  },
  'variant-4': {
    id: 'report-2',
    variantId: 'variant-4',
    overallScore: 92,
    analyzedAt: new Date('2024-03-13T15:20:00'),
    reportData: {
      overview: {
        summary: '管理画面のUIコンポーネント設計。Atomic Designパターンを採用し、再利用性を重視。',
        purpose: '一貫性のあるUIを提供し、開発速度を向上させるデザインシステムの構築。',
        techStack: ['React 18', 'TypeScript', 'Styled Components', 'Storybook'],
      },
      architecture: {
        pattern: 'Atomic Design',
        description: 'Atoms、Molecules、Organisms、Templates、Pagesの5層構造でコンポーネントを管理。',
        strengths: [
          'コンポーネントの再利用性が非常に高い',
          'デザインの一貫性が保たれやすい',
          'Storybookとの相性が良い',
        ],
        weaknesses: [
          'どの層に配置するか判断が難しい場合がある',
          '小規模プロジェクトではオーバーエンジニアリングになる可能性',
        ],
      },
      dependencies: {
        totalCount: 18,
        byType: { internal: 15, external: 3, circular: 0 },
        issues: [],
      },
      codeQuality: {
        overallScore: 92,
        metrics: { maintainability: 95, complexity: 85, testability: 92, reusability: 96 },
      },
      recommendations: [
        {
          id: 'rec-6',
          priority: 'medium',
          category: 'performance',
          title: 'Tree Shakingの最適化',
          description: 'コンポーネントのexportを個別に行い、Tree Shakingを最適化してください。',
          impact: 'バンドルサイズが約20%削減される見込み',
          effort: 'low',
        },
      ],
      risks: [
        {
          id: 'risk-5',
          severity: 'low',
          category: 'パフォーマンス',
          title: 'バンドルサイズの増加',
          description: 'コンポーネント数の増加に伴い、バンドルサイズが大きくなる可能性があります。',
          mitigation: 'Tree ShakingとCode Splittingを適切に設定してください。',
        },
      ],
    },
  },
};
