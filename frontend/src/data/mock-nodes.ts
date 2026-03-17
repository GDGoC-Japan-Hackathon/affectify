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

// 大規模レイアウト確認用モック（既存mockNodesは保持）
export const mockNodesLarge: BoardNode[] = [
  {
    id: "app.cmd.main",
    kind: "function",
    title: "main",
    file_path: "cmd/server/main.go",
    signature: "func()",
    receiver: "",
    x: 0, y: 0,
    code_text: `func main() {
\tlog.Println("starting server...")
\tif err := boot.Run(); err != nil {
\t\tlog.Fatalf("server exited with error: %v", err)
\t}
}`,
  },
  {
    id: "app.boot.run",
    kind: "function",
    title: "Run",
    file_path: "internal/boot/run.go",
    signature: "func Run() error",
    receiver: "",
    x: 0, y: 0,
    code_text: `func Run() error {
\tcfg, err := loadConfig()
\tif err != nil {
\t\treturn fmt.Errorf("loadConfig: %w", err)
\t}

\tdb, err := initDB(cfg.Database)
\tif err != nil {
\t\treturn fmt.Errorf("initDB: %w", err)
\t}
\tdefer db.Close()

\treturn startHTTP(cfg.Server, db)
}`,
  },
  {
    id: "app.boot.loadConfig",
    kind: "function",
    title: "loadConfig",
    file_path: "internal/boot/config.go",
    signature: "func loadConfig() (*Config, error)",
    receiver: "",
    x: 0, y: 0,
    code_text: `func loadConfig() (*Config, error) {
\tpath := os.Getenv("CONFIG_PATH")
\tif path == "" {
\t\tpath = "config/default.yaml"
\t}

\tf, err := os.Open(path)
\tif err != nil {
\t\treturn nil, fmt.Errorf("open config: %w", err)
\t}
\tdefer f.Close()

\tvar cfg Config
\tif err := yaml.NewDecoder(f).Decode(&cfg); err != nil {
\t\treturn nil, fmt.Errorf("decode config: %w", err)
\t}
\treturn &cfg, nil
}`,
  },
  {
    id: "app.boot.initDB",
    kind: "function",
    title: "initDB",
    file_path: "internal/boot/db.go",
    signature: "func initDB(cfg DatabaseConfig) (*sql.DB, error)",
    receiver: "",
    x: 0, y: 0,
    code_text: `func initDB(cfg DatabaseConfig) (*sql.DB, error) {
\tdsn := fmt.Sprintf(
\t\t"host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
\t\tcfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.Name,
\t)

\tdb, err := sql.Open("postgres", dsn)
\tif err != nil {
\t\treturn nil, fmt.Errorf("sql.Open: %w", err)
\t}

\tdb.SetMaxOpenConns(cfg.MaxConns)
\tdb.SetConnMaxLifetime(5 * time.Minute)

\tctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
\tdefer cancel()
\tif err := db.PingContext(ctx); err != nil {
\t\treturn nil, fmt.Errorf("db ping: %w", err)
\t}
\treturn db, nil
}`,
  },
  {
    id: "app.http.start",
    kind: "function",
    title: "startHTTP",
    file_path: "internal/http/server.go",
    signature: "func startHTTP(cfg ServerConfig, db *sql.DB) error",
    receiver: "",
    x: 0, y: 0,
    code_text: `func startHTTP(cfg ServerConfig, db *sql.DB) error {
\tmux := http.NewServeMux()
\tregisterRoutes(mux, db)

\tsrv := &http.Server{
\t\tAddr:         fmt.Sprintf(":%d", cfg.Port),
\t\tHandler:      mux,
\t\tReadTimeout:  15 * time.Second,
\t\tWriteTimeout: 15 * time.Second,
\t\tIdleTimeout:  60 * time.Second,
\t}

\tlog.Printf("listening on %s", srv.Addr)
\tif err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
\t\treturn fmt.Errorf("ListenAndServe: %w", err)
\t}
\treturn nil
}`,
  },
  {
    id: "app.http.register",
    kind: "function",
    title: "registerRoutes",
    file_path: "internal/http/routes.go",
    signature: "func registerRoutes(mux *http.ServeMux, db *sql.DB)",
    receiver: "",
    x: 0, y: 0,
    code_text: `func registerRoutes(mux *http.ServeMux, db *sql.DB) {
\trepo := repository.NewUserRepository(db)
\tsvc := service.NewUserService(repo)
\th := handler.NewUserHandler(svc)

\tauthMW := middleware.AuthMiddleware

\tmux.Handle("GET /users/{id}", authMW(http.HandlerFunc(h.GetUser)))
\tmux.Handle("POST /users", authMW(http.HandlerFunc(h.CreateUser)))
\tmux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
\t\tw.WriteHeader(http.StatusOK)
\t})
}`,
  },
  {
    id: "app.handler.user.get",
    kind: "method",
    title: "GetUser",
    file_path: "internal/handler/user.go",
    signature: "func(w http.ResponseWriter, r *http.Request)",
    receiver: "UserHandler",
    x: 0, y: 0,
    code_text: `func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
\tid := r.PathValue("id")
\tif id == "" {
\t\thttp.Error(w, "missing id", http.StatusBadRequest)
\t\treturn
\t}

\tuser, err := h.svc.GetUser(r.Context(), id)
\tif err != nil {
\t\tif errors.Is(err, service.ErrNotFound) {
\t\t\thttp.Error(w, "user not found", http.StatusNotFound)
\t\t\treturn
\t\t}
\t\thttp.Error(w, "internal error", http.StatusInternalServerError)
\t\treturn
\t}

\tw.Header().Set("Content-Type", "application/json")
\tjson.NewEncoder(w).Encode(user)
}`,
  },
  {
    id: "app.handler.user.create",
    kind: "method",
    title: "CreateUser",
    file_path: "internal/handler/user.go",
    signature: "func(w http.ResponseWriter, r *http.Request)",
    receiver: "UserHandler",
    x: 0, y: 0,
    code_text: `func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
\tvar input CreateUserInput
\tif err := json.NewDecoder(r.Body).Decode(&input); err != nil {
\t\thttp.Error(w, "invalid request body", http.StatusBadRequest)
\t\treturn
\t}
\tdefer r.Body.Close()

\tif err := input.Validate(); err != nil {
\t\thttp.Error(w, err.Error(), http.StatusUnprocessableEntity)
\t\treturn
\t}

\tuser, err := h.svc.CreateUser(r.Context(), input)
\tif err != nil {
\t\thttp.Error(w, "internal error", http.StatusInternalServerError)
\t\treturn
\t}

\tw.Header().Set("Content-Type", "application/json")
\tw.WriteHeader(http.StatusCreated)
\tjson.NewEncoder(w).Encode(user)
}`,
  },
  {
    id: "app.service.user.get",
    kind: "method",
    title: "GetUser",
    file_path: "internal/service/user.go",
    signature: "func(ctx context.Context, id string) (*User, error)",
    receiver: "UserService",
    x: 0, y: 0,
    code_text: `func (s *UserService) GetUser(ctx context.Context, id string) (*User, error) {
\tif id == "" {
\t\treturn nil, ErrInvalidID
\t}

\tuser, err := s.repo.FindByID(ctx, id)
\tif err != nil {
\t\tif errors.Is(err, repository.ErrNotFound) {
\t\t\treturn nil, ErrNotFound
\t\t}
\t\treturn nil, fmt.Errorf("FindByID: %w", err)
\t}

\t// キャッシュに解析結果があれば付与
\tif report, ok := analysis.GetReportCache(user.ID); ok {
\t\tuser.LatestReport = &report
\t}

\treturn user, nil
}`,
  },
  {
    id: "app.service.user.create",
    kind: "method",
    title: "CreateUser",
    file_path: "internal/service/user.go",
    signature: "func(ctx context.Context, in CreateUserInput) (*User, error)",
    receiver: "UserService",
    x: 0, y: 0,
    code_text: `func (s *UserService) CreateUser(ctx context.Context, in CreateUserInput) (*User, error) {
\tif err := in.Validate(); err != nil {
\t\treturn nil, fmt.Errorf("validate: %w", err)
\t}

\tentity := in.ToEntity()
\tentity.ID = uuid.NewString()
\tentity.CreatedAt = time.Now()

\tif _, err := s.repo.Save(ctx, entity); err != nil {
\t\treturn nil, fmt.Errorf("Save: %w", err)
\t}

\treturn entity, nil
}`,
  },
  {
    id: "app.repo.user.find",
    kind: "method",
    title: "FindByID",
    file_path: "internal/repository/user.go",
    signature: "func(ctx context.Context, id string) (*User, error)",
    receiver: "UserRepository",
    x: 0, y: 0,
    code_text: `func (r *UserRepository) FindByID(ctx context.Context, id string) (*User, error) {
\tconst q = \`
\t\tSELECT id, name, email, created_at
\t\tFROM users
\t\tWHERE id = $1 AND deleted_at IS NULL
\t\`

\tvar u User
\terr := r.db.QueryRowContext(ctx, q, id).Scan(
\t\t&u.ID, &u.Name, &u.Email, &u.CreatedAt,
\t)
\tif errors.Is(err, sql.ErrNoRows) {
\t\treturn nil, ErrNotFound
\t}
\tif err != nil {
\t\treturn nil, fmt.Errorf("QueryRow: %w", err)
\t}

\t// 参照整合性チェック後に解析を実行
\treport, err := analysis.RunAnalysis(ctx, u.ID)
\tif err != nil {
\t\tlog.Printf("warn: RunAnalysis skipped: %v", err)
\t} else {
\t\tu.LatestReport = &report
\t}

\treturn &u, nil
}`,
  },
  {
    id: "app.repo.user.save",
    kind: "method",
    title: "Save",
    file_path: "internal/repository/user.go",
    signature: "func(ctx context.Context, u *User) (*User, error)",
    receiver: "UserRepository",
    x: 0, y: 0,
    code_text: `func (r *UserRepository) Save(ctx context.Context, u *User) (*User, error) {
\tconst q = \`
\t\tINSERT INTO users (id, name, email, created_at)
\t\tVALUES ($1, $2, $3, $4)
\t\tON CONFLICT (email) DO UPDATE
\t\t\tSET name = EXCLUDED.name
\t\tRETURNING id, name, email, created_at
\t\`

\tvar saved User
\terr := r.db.QueryRowContext(ctx, q,
\t\tu.ID, u.Name, u.Email, u.CreatedAt,
\t).Scan(&saved.ID, &saved.Name, &saved.Email, &saved.CreatedAt)
\tif err != nil {
\t\treturn nil, fmt.Errorf("Insert: %w", err)
\t}
\treturn &saved, nil
}`,
  },
  {
    id: "app.auth.verify",
    kind: "function",
    title: "VerifyToken",
    file_path: "internal/auth/token.go",
    signature: "func(token string) (Claims, error)",
    receiver: "",
    x: 0, y: 0,
    code_text: `func VerifyToken(tokenStr string) (Claims, error) {
\ttoken, err := jwt.ParseWithClaims(
\t\ttokenStr,
\t\t&Claims{},
\t\tfunc(t *jwt.Token) (interface{}, error) {
\t\t\tif _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
\t\t\t\treturn nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
\t\t\t}
\t\t\treturn []byte(os.Getenv("JWT_SECRET")), nil
\t\t},
\t)
\tif err != nil {
\t\treturn Claims{}, fmt.Errorf("ParseWithClaims: %w", err)
\t}

\tclaims, ok := token.Claims.(*Claims)
\tif !ok || !token.Valid {
\t\treturn Claims{}, ErrInvalidToken
\t}
\treturn *claims, nil
}`,
  },
  {
    id: "app.middleware.auth",
    kind: "function",
    title: "AuthMiddleware",
    file_path: "internal/handler/middleware/auth.go",
    signature: "func(next http.Handler) http.Handler",
    receiver: "",
    x: 0, y: 0,
    code_text: `func AuthMiddleware(next http.Handler) http.Handler {
\treturn http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
\t\tauthorization := r.Header.Get("Authorization")
\t\tif authorization == "" {
\t\t\thttp.Error(w, "missing Authorization header", http.StatusUnauthorized)
\t\t\treturn
\t\t}

\t\tparts := strings.SplitN(authorization, " ", 2)
\t\tif len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
\t\t\thttp.Error(w, "invalid Authorization format", http.StatusUnauthorized)
\t\t\treturn
\t\t}

\t\tclaims, err := auth.VerifyToken(parts[1])
\t\tif err != nil {
\t\t\thttp.Error(w, "invalid token", http.StatusUnauthorized)
\t\t\treturn
\t\t}

\t\tctx := context.WithValue(r.Context(), ctxKeyUserID, claims.UserID)
\t\tnext.ServeHTTP(w, r.WithContext(ctx))
\t})
}`,
  },
  {
    id: "app.analysis.run",
    kind: "function",
    title: "RunAnalysis",
    file_path: "internal/analysis/run.go",
    signature: "func(ctx context.Context, code string) (Report, error)",
    receiver: "",
    x: 0, y: 0,
    code_text: `func RunAnalysis(ctx context.Context, code string) (Report, error) {
\tkey := hashKey(code)

\t// キャッシュヒット確認
\tif cached, ok := GetReportCache(key); ok {
\t\treturn cached, nil
\t}

\t// グラフ構築してSCC/トポロジカルソート
\tnodes, edges := parseCallGraph(code)
\tg := graph.BuildGraph(nodes, edges)

\treport := Report{
\t\tSCCs:      graph.FindSCC(g),
\t\tTopoOrder: graph.TopoSort(g),
\t\tGeneratedAt: time.Now(),
\t}

\tPutReportCache(key, report)
\treturn report, nil
}`,
  },
  {
    id: "app.analysis.cache.get",
    kind: "function",
    title: "GetReportCache",
    file_path: "internal/analysis/cache.go",
    signature: "func(key string) (Report, bool)",
    receiver: "",
    x: 0, y: 0,
    code_text: `// reportCache はインメモリキャッシュ（TTL付き）
var reportCache sync.Map

func GetReportCache(key string) (Report, bool) {
\tv, ok := reportCache.Load(key)
\tif !ok {
\t\treturn Report{}, false
\t}

\tentry := v.(cacheEntry)
\tif time.Since(entry.cachedAt) > 5*time.Minute {
\t\treportCache.Delete(key)
\t\tPutReportCache(key, entry.report) // 非同期リフレッシュをトリガー
\t\treturn entry.report, true
\t}

\treturn entry.report, true
}`,
  },
  {
    id: "app.analysis.cache.put",
    kind: "function",
    title: "PutReportCache",
    file_path: "internal/analysis/cache.go",
    signature: "func(key string, report Report)",
    receiver: "",
    x: 0, y: 0,
    code_text: `func PutReportCache(key string, report Report) {
\treportCache.Store(key, cacheEntry{
\t\treport:   report,
\t\tcachedAt: time.Now(),
\t})

\t// LRU: エントリ数が上限を超えたら古い順に削除
\tcount := 0
\treportCache.Range(func(_, _ any) bool {
\t\tcount++
\t\treturn true
\t})
\tif count > maxCacheSize {
\t\tpruneOldest()
\t}
}`,
  },
  {
    id: "app.graph.build",
    kind: "function",
    title: "BuildGraph",
    file_path: "internal/graph/build.go",
    signature: "func(nodes []Node, edges []Edge) Graph",
    receiver: "",
    x: 0, y: 0,
    code_text: `func BuildGraph(nodes []Node, edges []Edge) Graph {
\tadj := make(map[NodeID][]NodeID, len(nodes))
\tradj := make(map[NodeID][]NodeID, len(nodes))

\tfor _, n := range nodes {
\t\tadj[n.ID] = []NodeID{}
\t\tradj[n.ID] = []NodeID{}
\t}

\tfor _, e := range edges {
\t\tadj[e.From] = append(adj[e.From], e.To)
\t\tradj[e.To] = append(radj[e.To], e.From)
\t}

\treturn Graph{
\t\tNodes: nodes,
\t\tEdges: edges,
\t\tAdj:   adj,
\t\tRAdj:  radj,
\t}
}`,
  },
  {
    id: "app.graph.scc",
    kind: "function",
    title: "FindSCC",
    file_path: "internal/graph/scc.go",
    signature: "func(g Graph) [][]NodeID",
    receiver: "",
    x: 0, y: 0,
    code_text: `// FindSCC はKosarajuのアルゴリズムでSCCを列挙する
func FindSCC(g Graph) [][]NodeID {
\tvisited := make(map[NodeID]bool)
\torder := []NodeID{}

\tvar dfs1 func(v NodeID)
\tdfs1 = func(v NodeID) {
\t\tvisited[v] = true
\t\tfor _, u := range g.Adj[v] {
\t\t\tif !visited[u] {
\t\t\t\tdfs1(u)
\t\t\t}
\t\t}
\t\torder = append(order, v)
\t}

\tfor _, n := range g.Nodes {
\t\tif !visited[n.ID] {
\t\t\tdfs1(n.ID)
\t\t}
\t}

\tvisited = make(map[NodeID]bool)
\tsccs := [][]NodeID{}

\tvar dfs2 func(v NodeID, scc *[]NodeID)
\tdfs2 = func(v NodeID, scc *[]NodeID) {
\t\tvisited[v] = true
\t\t*scc = append(*scc, v)
\t\tfor _, u := range g.RAdj[v] {
\t\t\tif !visited[u] {
\t\t\t\tdfs2(u, scc)
\t\t\t}
\t\t}
\t}

\tfor i := len(order) - 1; i >= 0; i-- {
\t\tv := order[i]
\t\tif !visited[v] {
\t\t\tscc := []NodeID{}
\t\t\tdfs2(v, &scc)
\t\t\tsccs = append(sccs, scc)
\t\t}
\t}
\treturn sccs
}`,
  },
  {
    id: "app.graph.topo",
    kind: "function",
    title: "TopoSort",
    file_path: "internal/graph/topo.go",
    signature: "func(g Graph) []NodeID",
    receiver: "",
    x: 0, y: 0,
    code_text: `// TopoSort はKahnのアルゴリズムでトポロジカルソートを行う。
// 閉路がある場合は残ったノードをそのまま末尾に追加する。
func TopoSort(g Graph) []NodeID {
\tinDeg := make(map[NodeID]int, len(g.Nodes))
\tfor _, n := range g.Nodes {
\t\tinDeg[n.ID] = 0
\t}
\tfor _, edges := range g.Adj {
\t\tfor _, to := range edges {
\t\t\tinDeg[to]++
\t\t}
\t}

\tqueue := []NodeID{}
\tfor id, deg := range inDeg {
\t\tif deg == 0 {
\t\t\tqueue = append(queue, id)
\t\t}
\t}
\tsort.Slice(queue, func(i, j int) bool { return queue[i] < queue[j] })

\tresult := make([]NodeID, 0, len(g.Nodes))
\tfor len(queue) > 0 {
\t\tv := queue[0]
\t\tqueue = queue[1:]
\t\tresult = append(result, v)
\t\tfor _, u := range g.Adj[v] {
\t\t\tinDeg[u]--
\t\t\tif inDeg[u] == 0 {
\t\t\t\tqueue = append(queue, u)
\t\t\t}
\t\t}
\t}
\treturn result
}`,
  },
  {
    id: "app.ui.note",
    kind: "note",
    title: "Architecture Notes",
    file_path: "",
    signature: "",
    receiver: "",
    x: 0, y: 0,
    code_text: `## アーキテクチャ概要

このサービスは Clean Architecture に従い、
Handler → Service → Repository の3層構造で実装されています。

### 循環依存について
- service.GetUser ↔ repo.FindByID ↔ analysis.RunAnalysis は意図的なSCC
- analysis パッケージ内でもキャッシュのリフレッシュループが存在する
- graph パッケージ自体もSCC/トポロジカルソートの内部で相互参照

### 改善点（TODO）
- analysis.RunAnalysis を非同期キューに切り出す
- キャッシュを Redis に移行して水平スケールに対応する`,
  },
];
