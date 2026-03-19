package analyzer

import (
	"bytes"
	"fmt"
	"go/ast"
	"go/printer"
	"go/token"
	"go/types"
	"path/filepath"
	"strings"

	"golang.org/x/tools/go/packages"
)

// ParsedFile holds file-level info needed to reconstruct compilable Go code.
type ParsedFile struct {
	FilePath    string
	PackageName string
	Imports     []string // each entry is a raw import path string e.g. `"fmt"` or `io "io"`
}

// ParsedNode represents a single declaration extracted from source.
type ParsedNode struct {
	ID        string // unique key: pkgPath.Name or pkgPath.(Receiver).Name
	FilePath  string
	Kind      string // function | method | struct | interface | type | const | var
	Title     string
	Signature string
	Receiver  string
	CodeText  string
	Layer     string
	X, Y      float64
}

// ParsedEdge represents a call relationship between two nodes.
type ParsedEdge struct {
	FromID string
	ToID   string
	Kind   string // call
	Style  string // solid
}

// Result is the output of Parse().
type Result struct {
	Files []ParsedFile
	Nodes []ParsedNode
	Edges []ParsedEdge
}

// defaultExcludedDirs are directory name segments that indicate auto-generated code.
var defaultExcludedDirs = []string{
	"gen", "vendor", "mock", "mocks", "testdata",
}

// defaultExcludedSuffixes are file name suffixes that indicate auto-generated code.
var defaultExcludedSuffixes = []string{
	".gen.go", ".pb.go", ".connect.go", "_mock.go", "_test.go",
}

// Parser analyzes Go source code and extracts declarations and call relationships.
type Parser struct {
	fset        *token.FileSet
	pkgs        []*packages.Package
	baseDir     string
	nodeMap     map[string]*ParsedNode
	nodes       []ParsedNode
	edges       []ParsedEdge
	fileInfoMap map[string]*ParsedFile
	files       []ParsedFile
	nodeID      int
	edgeID      int
}

// New creates a Parser for the given directory.
func New(dir string) *Parser {
	baseDir, err := filepath.Abs(dir)
	if err != nil {
		baseDir = dir
	}
	return &Parser{
		baseDir:     baseDir,
		nodeMap:     make(map[string]*ParsedNode),
		fileInfoMap: make(map[string]*ParsedFile),
	}
}

// Parse analyzes all Go packages in the directory and returns the result.
func (p *Parser) Parse() (*Result, error) {
	cfg := &packages.Config{
		Mode: packages.NeedName |
			packages.NeedFiles |
			packages.NeedSyntax |
			packages.NeedTypes |
			packages.NeedTypesInfo |
			packages.NeedImports |
			packages.NeedDeps,
		Dir: p.baseDir,
	}

	pkgs, err := packages.Load(cfg, "./...")
	if err != nil {
		return nil, fmt.Errorf("failed to load packages: %w", err)
	}
	if len(pkgs) == 0 {
		return &Result{}, nil
	}

	p.fset = pkgs[0].Fset
	p.pkgs = pkgs

	for _, pkg := range pkgs {
		p.extractNodes(pkg)
	}
	for _, pkg := range pkgs {
		p.extractEdges(pkg)
	}
	p.extractReceiverEdges()
	p.assignPositions()

	return &Result{
		Files: p.files,
		Nodes: p.nodes,
		Edges: p.edges,
	}, nil
}

// extractNodes extracts all declarations (functions, methods, types, etc.) from a package.
func (p *Parser) extractNodes(pkg *packages.Package) {
	if pkg.TypesInfo == nil {
		return // skip packages that failed to type-check (e.g. compile errors)
	}
	for i, file := range pkg.Syntax {
		relPath := p.relativeFilePath(pkg, i, file)
		if isExcluded(relPath) {
			continue
		}
		p.collectFileInfo(file, relPath)

		ast.Inspect(file, func(n ast.Node) bool {
			switch decl := n.(type) {
			case *ast.FuncDecl:
				node := p.funcDeclToNode(pkg, decl, relPath)
				p.nodes = append(p.nodes, node)
				p.nodeMap[node.ID] = &p.nodes[len(p.nodes)-1]
			case *ast.GenDecl:
				nodes := p.genDeclToNodes(pkg, decl, relPath)
				for _, node := range nodes {
					p.nodes = append(p.nodes, node)
					p.nodeMap[node.ID] = &p.nodes[len(p.nodes)-1]
				}
				return false
			}
			return true
		})
	}
}

func (p *Parser) relativeFilePath(pkg *packages.Package, index int, file *ast.File) string {
	if index < len(pkg.CompiledGoFiles) && pkg.CompiledGoFiles[index] != "" {
		return p.relToBase(pkg.CompiledGoFiles[index])
	}
	if index < len(pkg.GoFiles) && pkg.GoFiles[index] != "" {
		return p.relToBase(pkg.GoFiles[index])
	}
	if fileInfo := p.fset.File(file.Pos()); fileInfo != nil && fileInfo.Name() != "" {
		return p.relToBase(fileInfo.Name())
	}
	filePath := p.fset.PositionFor(file.Pos(), false).Filename
	if filePath == "" {
		return ""
	}
	return p.relToBase(filePath)
}

func (p *Parser) relToBase(path string) string {
	absPath, err := filepath.Abs(path)
	if err != nil {
		absPath = path
	}
	if relPath, err := filepath.Rel(p.baseDir, absPath); err == nil {
		return relPath
	}
	return absPath
}

// isExcluded returns true if the file path should be skipped (auto-generated or test files).
func isExcluded(relPath string) bool {
	normalized := filepath.ToSlash(relPath)
	parts := strings.Split(normalized, "/")

	// Check directory segments
	for _, part := range parts[:len(parts)-1] {
		for _, excluded := range defaultExcludedDirs {
			if part == excluded {
				return true
			}
		}
	}

	// Check file name suffixes
	fileName := parts[len(parts)-1]
	for _, suffix := range defaultExcludedSuffixes {
		if strings.HasSuffix(fileName, suffix) {
			return true
		}
	}

	return false
}

// collectFileInfo records package name and imports for a source file.
func (p *Parser) collectFileInfo(file *ast.File, relPath string) {
	if _, exists := p.fileInfoMap[relPath]; exists {
		return
	}

	var imports []string
	for _, imp := range file.Imports {
		s := imp.Path.Value
		if imp.Name != nil {
			s = imp.Name.Name + " " + s
		}
		imports = append(imports, s)
	}

	info := ParsedFile{
		FilePath:    relPath,
		PackageName: file.Name.Name,
		Imports:     imports,
	}
	p.fileInfoMap[relPath] = &info
	p.files = append(p.files, info)
}

// funcDeclToNode converts a function/method declaration to a ParsedNode.
func (p *Parser) funcDeclToNode(pkg *packages.Package, decl *ast.FuncDecl, filePath string) ParsedNode {
	p.nodeID++

	kind := "function"
	receiver := ""
	title := decl.Name.Name
	var id string

	if decl.Recv != nil && len(decl.Recv.List) > 0 {
		kind = "method"
		receiver = p.receiverType(decl.Recv.List[0].Type)
		id = fmt.Sprintf("%s.(%s).%s", pkg.PkgPath, receiver, title)
	} else {
		id = fmt.Sprintf("%s.%s", pkg.PkgPath, title)
	}

	return ParsedNode{
		ID:        id,
		FilePath:  filePath,
		Kind:      kind,
		Title:     title,
		Signature: p.buildSignature(pkg, decl),
		Receiver:  receiver,
		CodeText:  p.printNode(decl),
		Layer:     p.inferLayer(filePath),
	}
}

// genDeclToNodes converts a GenDecl (type/const/var) into ParsedNode(s).
func (p *Parser) genDeclToNodes(pkg *packages.Package, decl *ast.GenDecl, filePath string) []ParsedNode {
	var nodes []ParsedNode

	for _, spec := range decl.Specs {
		switch s := spec.(type) {
		case *ast.TypeSpec:
			kind := "type"
			switch s.Type.(type) {
			case *ast.StructType:
				kind = "struct"
			case *ast.InterfaceType:
				kind = "interface"
			}
			p.nodeID++
			nodes = append(nodes, ParsedNode{
				ID:       fmt.Sprintf("%s.%s", pkg.PkgPath, s.Name.Name),
				FilePath: filePath,
				Kind:     kind,
				Title:    s.Name.Name,
				CodeText: p.printSyntheticDecl(decl.Tok, s),
				Layer:    p.inferLayer(filePath),
			})

		case *ast.ValueSpec:
			kind := "var"
			if decl.Tok == token.CONST {
				kind = "const"
			}
			for _, name := range s.Names {
				p.nodeID++
				nodes = append(nodes, ParsedNode{
					ID:       fmt.Sprintf("%s.%s", pkg.PkgPath, name.Name),
					FilePath: filePath,
					Kind:     kind,
					Title:    name.Name,
					CodeText: p.printSyntheticDecl(decl.Tok, s),
					Layer:    p.inferLayer(filePath),
				})
			}
		}
	}
	return nodes
}

// printNode prints any AST node to source code string.
func (p *Parser) printNode(node ast.Node) string {
	var buf bytes.Buffer
	if err := printer.Fprint(&buf, p.fset, node); err != nil {
		return ""
	}
	return buf.String()
}

// printSyntheticDecl prints a single spec as a standalone declaration.
func (p *Parser) printSyntheticDecl(tok token.Token, spec ast.Spec) string {
	var buf bytes.Buffer
	synth := &ast.GenDecl{Tok: tok, Specs: []ast.Spec{spec}}
	if err := printer.Fprint(&buf, p.fset, synth); err != nil {
		return ""
	}
	return buf.String()
}

func (p *Parser) receiverType(expr ast.Expr) string {
	switch t := expr.(type) {
	case *ast.Ident:
		return t.Name
	case *ast.StarExpr:
		if ident, ok := t.X.(*ast.Ident); ok {
			return ident.Name
		}
	}
	return ""
}

func (p *Parser) buildSignature(pkg *packages.Package, decl *ast.FuncDecl) string {
	obj := pkg.TypesInfo.Defs[decl.Name]
	if obj == nil {
		return ""
	}
	fn, ok := obj.(*types.Func)
	if !ok {
		return ""
	}
	sig := fn.Type().(*types.Signature)
	return types.TypeString(sig, func(p *types.Package) string {
		return p.Name()
	})
}

func (p *Parser) inferLayer(filePath string) string {
	lower := strings.ToLower(filePath)
	switch {
	case strings.Contains(lower, "handler") || strings.Contains(lower, "controller"):
		return "handler"
	case strings.Contains(lower, "service") || strings.Contains(lower, "usecase"):
		return "service"
	case strings.Contains(lower, "repo") || strings.Contains(lower, "repository"):
		return "repo"
	case strings.Contains(lower, "domain") || strings.Contains(lower, "entity"):
		return "domain"
	case strings.Contains(lower, "infra") || strings.Contains(lower, "infrastructure"):
		return "infra"
	default:
		return ""
	}
}

// extractEdges extracts call relationships from a package.
func (p *Parser) extractEdges(pkg *packages.Package) {
	if pkg.TypesInfo == nil {
		return
	}
	for i, file := range pkg.Syntax {
		relPath := p.relativeFilePath(pkg, i, file)
		if isExcluded(relPath) {
			continue
		}
		ast.Inspect(file, func(n ast.Node) bool {
			call, ok := n.(*ast.CallExpr)
			if !ok {
				return true
			}

			callerID := p.findEnclosingFunc(pkg, file, call.Pos())
			if callerID == "" {
				return true
			}
			calleeID := p.resolveCallee(pkg, call)
			if calleeID == "" || callerID == calleeID {
				return true
			}
			if _, ok := p.nodeMap[callerID]; !ok {
				return true
			}
			if _, ok := p.nodeMap[calleeID]; !ok {
				return true
			}

			p.edgeID++
			p.edges = append(p.edges, ParsedEdge{
				FromID: callerID,
				ToID:   calleeID,
				Kind:   "call",
				Style:  "solid",
			})
			return true
		})
	}
}

func (p *Parser) findEnclosingFunc(pkg *packages.Package, file *ast.File, pos token.Pos) string {
	var enclosing string
	ast.Inspect(file, func(n ast.Node) bool {
		if n == nil {
			return false
		}
		if fn, ok := n.(*ast.FuncDecl); ok {
			if fn.Pos() <= pos && pos <= fn.End() {
				if fn.Recv != nil && len(fn.Recv.List) > 0 {
					recv := p.receiverType(fn.Recv.List[0].Type)
					enclosing = fmt.Sprintf("%s.(%s).%s", pkg.PkgPath, recv, fn.Name.Name)
				} else {
					enclosing = fmt.Sprintf("%s.%s", pkg.PkgPath, fn.Name.Name)
				}
			}
		}
		return true
	})
	return enclosing
}

func (p *Parser) resolveCallee(pkg *packages.Package, call *ast.CallExpr) string {
	switch fn := call.Fun.(type) {
	case *ast.Ident:
		if obj := pkg.TypesInfo.Uses[fn]; obj != nil {
			if f, ok := obj.(*types.Func); ok {
				if f.Pkg() == nil {
					return ""
				}
				return f.FullName()
			}
		}
	case *ast.SelectorExpr:
		if sel := pkg.TypesInfo.Selections[fn]; sel != nil {
			if f, ok := sel.Obj().(*types.Func); ok {
				if f.Pkg() == nil {
					return ""
				}
				recvName := p.extractTypeName(sel.Recv())
				return fmt.Sprintf("%s.(%s).%s", f.Pkg().Path(), recvName, f.Name())
			}
		} else if obj := pkg.TypesInfo.Uses[fn.Sel]; obj != nil {
			if f, ok := obj.(*types.Func); ok {
				if f.Pkg() == nil {
					return ""
				}
				return f.FullName()
			}
		}
	}
	return ""
}

func (p *Parser) extractTypeName(t types.Type) string {
	switch typ := t.(type) {
	case *types.Named:
		return typ.Obj().Name()
	case *types.Pointer:
		return p.extractTypeName(typ.Elem())
	}
	return ""
}

// extractReceiverEdges creates edges from struct/interface nodes to their methods.
func (p *Parser) extractReceiverEdges() {
	for _, node := range p.nodes {
		if node.Kind != "method" || node.Receiver == "" {
			continue
		}

		// Derive struct node ID from method ID: "pkgPath.(Receiver).Method" → "pkgPath.Receiver"
		// Method ID format: "pkgPath.(ReceiverName).MethodName"
		closeParen := strings.Index(node.ID, ").")
		if closeParen < 0 {
			continue
		}
		structID := strings.Replace(node.ID[:closeParen+1], ".("+node.Receiver, "."+node.Receiver, 1)

		if _, ok := p.nodeMap[structID]; !ok {
			continue
		}

		p.edgeID++
		p.edges = append(p.edges, ParsedEdge{
			FromID: structID,
			ToID:   node.ID,
			Kind:   "implement",
			Style:  "dashed",
		})
	}
}

// assignPositions assigns grid layout x/y to all nodes.
func (p *Parser) assignPositions() {
	const colWidth = 300.0
	const rowHeight = 150.0
	const nodesPerRow = 4

	for i := range p.nodes {
		row := i / nodesPerRow
		col := i % nodesPerRow
		p.nodes[i].X = float64(col) * colWidth
		p.nodes[i].Y = float64(row) * rowHeight
	}
}
