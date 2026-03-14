import type { BoardNode } from "@/types/type";

export const mockNodes: BoardNode[] = [
  {
    id: "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.(Parser).Parse",
    kind: "method",
    title: "Parse",
    file_path: "internal/parser/parser.go",
    signature: "func(patterns []string) (*Result, error)",
    receiver: "Parser",
    x: 0,
    y: 0,
    code_text: `func (p *Parser) Parse(patterns []string) (*Result, error) {
\tresult := &Result{
\t\tNodes: make([]Node, 0),
\t\tEdges: make([]Edge, 0),
\t}

\tfor _, pattern := range patterns {
\t\tmatches, err := filepath.Glob(pattern)
\t\tif err != nil {
\t\t\treturn nil, fmt.Errorf("invalid pattern %q: %w", pattern, err)
\t\t}
\t\tfor _, match := range matches {
\t\t\tif err := p.parseFile(match, result); err != nil {
\t\t\t\treturn nil, err
\t\t\t}
\t\t}
\t}

\treturn result, nil
}`,
  },
  {
    id: "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.(Parser).relToBase",
    kind: "method",
    title: "relToBase",
    file_path: "internal/parser/parser.go",
    signature: "func(path string) string",
    receiver: "Parser",
    x: 0,
    y: 150,
    code_text: `func (p *Parser) relToBase(path string) string {
\tabsPath, err := filepath.Abs(path)
\tif err != nil {
\t\tabsPath = path
\t}

\tif relPath, err := filepath.Rel(p.baseDir, absPath); err == nil {
\t\treturn relPath
\t}
\treturn absPath
}`,
  },
  {
    id: "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.(Parser).relativeFilePath",
    kind: "method",
    title: "relativeFilePath",
    file_path: "internal/parser/parser.go",
    signature: "func(pos token.Position) string",
    receiver: "Parser",
    x: 400,
    y: 0,
    code_text: `func (p *Parser) relativeFilePath(pos token.Position) string {
\treturn p.relToBase(pos.Filename)
}`,
  },
  {
    id: "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.NewParser",
    kind: "function",
    title: "NewParser",
    file_path: "internal/parser/parser.go",
    signature: "func(baseDir string) *Parser",
    receiver: "",
    x: 400,
    y: 150,
    code_text: `func NewParser(baseDir string) *Parser {
\treturn &Parser{
\t\tbaseDir: baseDir,
\t}
}`,
  },
  {
    id: "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.Analyzer",
    kind: "interface",
    title: "Analyzer",
    file_path: "internal/parser/analyzer.go",
    signature: "interface { Analyze(ctx context.Context) error }",
    receiver: "",
    x: 800,
    y: 0,
    code_text: `type Analyzer interface {
\tAnalyze(ctx context.Context) error
}`,
  },
  {
    id: "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.Note1",
    kind: "note",
    title: "Parser Package Overview",
    file_path: "",
    signature: "",
    receiver: "",
    x: 800,
    y: 150,
    code_text:
      "This package handles parsing Go source files and extracting function/method call graphs.",
  },
];
