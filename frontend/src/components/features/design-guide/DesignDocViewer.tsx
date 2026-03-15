import { AnalysisReport } from '@/types/type';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Package,
  Code,
  Shield,
  Zap,
  Clock,
} from 'lucide-react';

interface DesignDocViewerProps {
  document: AnalysisReport;
  mode?: 'full' | 'overview' | 'preview';
}

export function DesignDocViewer({ document: doc, mode = 'full' }: DesignDocViewerProps) {
  const document = doc.reportData;
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEffortIcon = (effort: string) => {
    switch (effort) {
      case 'high':
        return '\u23F0\u23F0\u23F0';
      case 'medium':
        return '\u23F0\u23F0';
      default:
        return '\u23F0';
    }
  };

  if (mode === 'preview') {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">設計概要</h3>
          <p className="text-sm text-gray-600">{document.overview.summary}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">コード品質スコア</h4>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Progress value={document.codeQuality.overallScore} className="h-2" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {document.codeQuality.overallScore}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'overview') {
    return (
      <div className="space-y-6">
        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              プロジェクト概要
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">サマリー</h4>
              <p className="text-sm text-gray-600">{document.overview.summary}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">目的</h4>
              <p className="text-sm text-gray-600">{document.overview.purpose}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">技術スタック</h4>
              <div className="flex flex-wrap gap-2">
                {document.overview.techStack.map((tech) => (
                  <Badge key={tech} variant="secondary">
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Code Quality */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              コード品質スコア
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">総合スコア</span>
                <span className="text-3xl font-bold text-gray-900">
                  {document.codeQuality.overallScore}
                </span>
              </div>
              <Progress value={document.codeQuality.overallScore} className="h-3" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">保守性</span>
                  <span className="text-sm font-medium">
                    {document.codeQuality.metrics.maintainability}
                  </span>
                </div>
                <Progress value={document.codeQuality.metrics.maintainability} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">複雑度</span>
                  <span className="text-sm font-medium">
                    {document.codeQuality.metrics.complexity}
                  </span>
                </div>
                <Progress value={document.codeQuality.metrics.complexity} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">テスト可能性</span>
                  <span className="text-sm font-medium">
                    {document.codeQuality.metrics.testability}
                  </span>
                </div>
                <Progress value={document.codeQuality.metrics.testability} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">再利用性</span>
                  <span className="text-sm font-medium">
                    {document.codeQuality.metrics.reusability}
                  </span>
                </div>
                <Progress value={document.codeQuality.metrics.reusability} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              主な改善提案 (Top 3)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {document.recommendations.slice(0, 3).map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{rec.title}</h4>
                    <Badge variant={getPriorityColor(rec.priority)}>{rec.priority}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{rec.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risks */}
        {document.risks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                リスク概要
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {document.risks.slice(0, 3).map((risk) => (
                  <div
                    key={risk.id}
                    className={`p-3 rounded-lg border ${getSeverityColor(risk.severity)}`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-medium">{risk.title}</h4>
                      <span className="text-xs uppercase font-semibold">{risk.severity}</span>
                    </div>
                    <p className="text-sm line-clamp-1">{risk.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Full mode
  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            プロジェクト概要
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">サマリー</h4>
            <p className="text-sm text-gray-600">{document.overview.summary}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">目的</h4>
            <p className="text-sm text-gray-600">{document.overview.purpose}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">技術スタック</h4>
            <div className="flex flex-wrap gap-2">
              {document.overview.techStack.map((tech) => (
                <Badge key={tech} variant="secondary">
                  {tech}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Architecture */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            アーキテクチャ分析
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">パターン</h4>
            <Badge variant="default" className="mb-2">
              {document.architecture.pattern}
            </Badge>
            <p className="text-sm text-gray-600">{document.architecture.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                強み
              </h4>
              <ul className="space-y-1">
                {document.architecture.strengths.map((strength, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">{'\u2713'}</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <XCircle className="w-4 h-4 text-orange-600" />
                弱み・課題
              </h4>
              <ul className="space-y-1">
                {document.architecture.weaknesses.map((weakness, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5">!</span>
                    {weakness}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dependencies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            依存関係分析
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {document.dependencies.totalCount}
              </div>
              <div className="text-xs text-gray-600">総数</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-900">
                {document.dependencies.byType.internal}
              </div>
              <div className="text-xs text-gray-600">内部依存</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-900">
                {document.dependencies.byType.external}
              </div>
              <div className="text-xs text-gray-600">外部依存</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-900">
                {document.dependencies.byType.circular}
              </div>
              <div className="text-xs text-gray-600">循環依存</div>
            </div>
          </div>

          {document.dependencies.issues.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">検出された問題</h4>
              <div className="space-y-2">
                {document.dependencies.issues.map((issue, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border ${
                      issue.severity === 'high'
                        ? 'bg-red-50 border-red-200'
                        : issue.severity === 'medium'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge
                        variant={
                          issue.severity === 'high'
                            ? 'destructive'
                            : issue.severity === 'medium'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {issue.type}
                      </Badge>
                      <span className="text-xs text-gray-600 uppercase">{issue.severity}</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{issue.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {issue.affectedNodes.map((node) => (
                        <Badge key={node} variant="outline" className="text-xs">
                          {node}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Code Quality */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            コード品質分析
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">総合スコア</span>
              <span className="text-3xl font-bold text-gray-900">
                {document.codeQuality.overallScore}
              </span>
            </div>
            <Progress value={document.codeQuality.overallScore} className="h-3" />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">保守性</span>
                <span className="text-sm font-medium">
                  {document.codeQuality.metrics.maintainability}
                </span>
              </div>
              <Progress value={document.codeQuality.metrics.maintainability} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">複雑度</span>
                <span className="text-sm font-medium">
                  {document.codeQuality.metrics.complexity}
                </span>
              </div>
              <Progress value={document.codeQuality.metrics.complexity} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">テスト可能性</span>
                <span className="text-sm font-medium">
                  {document.codeQuality.metrics.testability}
                </span>
              </div>
              <Progress value={document.codeQuality.metrics.testability} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">再利用性</span>
                <span className="text-sm font-medium">
                  {document.codeQuality.metrics.reusability}
                </span>
              </div>
              <Progress value={document.codeQuality.metrics.reusability} className="h-2" />
            </div>
          </div>

          <div className="space-y-3">
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            改善提案
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {document.recommendations.map((rec) => {
              const getCategoryIcon = () => {
                switch (rec.category) {
                  case 'architecture':
                    return Package;
                  case 'performance':
                    return Zap;
                  case 'security':
                    return Shield;
                  default:
                    return Code;
                }
              };
              const Icon = getCategoryIcon();

              return (
                <div
                  key={rec.id}
                  className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-500" />
                      <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getPriorityColor(rec.priority)} className="shrink-0">
                        {rec.priority}
                      </Badge>
                      <span className="text-xs text-gray-500">{getEffortIcon(rec.effort)}</span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">{rec.description}</p>

                  <div className="flex items-start gap-2 text-sm">
                    <span className="font-medium text-gray-700">Impact:</span>
                    <span className="text-gray-600">{rec.impact}</span>
                  </div>

                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Risks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            リスク分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {document.risks.map((risk) => (
              <div
                key={risk.id}
                className={`p-4 rounded-lg border ${getSeverityColor(risk.severity)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <Badge variant="outline" className="mb-2">
                      {risk.category}
                    </Badge>
                    <h4 className="font-semibold">{risk.title}</h4>
                  </div>
                  <span className="text-xs uppercase font-semibold">{risk.severity}</span>
                </div>

                <p className="text-sm mb-3">{risk.description}</p>

                <div className="flex items-start gap-2 text-sm">
                  <span className="font-medium">対策:</span>
                  <span>{risk.mitigation}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generated Info */}
      <div className="text-center text-sm text-gray-500 flex items-center justify-center gap-2">
        <Clock className="w-4 h-4" />
        生成日時: {doc.analyzedAt.toLocaleString('ja-JP')}
      </div>
    </div>
  );
}
