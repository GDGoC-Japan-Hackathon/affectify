package graphbuild

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

type Parser struct {
	fset    *token.FileSet
	pkgs    []*packages.Package
	baseDir string
	nodeMap map[string]*ParsedNode
	nodes   []ParsedNode
	edges   []ParsedEdge
}

func NewParser(dir string) *Parser {
	baseDir, err := filepath.Abs(dir)
	if err != nil {
		baseDir = dir
	}

	return &Parser{
		baseDir: baseDir,
		nodeMap: make(map[string]*ParsedNode),
	}
}

func (p *Parser) Parse() (*Board, error) {
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
		return &Board{}, nil
	}

	p.fset = pkgs[0].Fset
	p.pkgs = pkgs

	for _, pkg := range pkgs {
		p.extractNodes(pkg)
	}
	for _, pkg := range pkgs {
		p.extractEdges(pkg)
	}

	p.assignPositions()

	return &Board{
		Nodes: p.nodes,
		Edges: p.edges,
	}, nil
}

func (p *Parser) extractNodes(pkg *packages.Package) {
	for i, file := range pkg.Syntax {
		relPath := p.relativeFilePath(pkg, i, file)

		ast.Inspect(file, func(n ast.Node) bool {
			fn, ok := n.(*ast.FuncDecl)
			if !ok {
				return true
			}

			node := p.funcDeclToNode(pkg, fn, relPath)
			p.nodes = append(p.nodes, node)
			p.nodeMap[node.ID] = &p.nodes[len(p.nodes)-1]
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

func (p *Parser) funcDeclToNode(pkg *packages.Package, decl *ast.FuncDecl, filePath string) ParsedNode {
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
		Kind:      kind,
		Title:     title,
		FilePath:  filePath,
		Signature: p.buildSignature(pkg, decl),
		Receiver:  receiver,
		Layer:     inferLayer(filePath),
		CodeText:  p.extractCodeText(decl),
	}
}

func (p *Parser) extractCodeText(decl *ast.FuncDecl) string {
	var buf bytes.Buffer
	if err := printer.Fprint(&buf, p.fset, decl); err != nil {
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
	sig, ok := fn.Type().(*types.Signature)
	if !ok {
		return ""
	}
	return types.TypeString(sig, func(p *types.Package) string {
		return p.Name()
	})
}

func inferLayer(filePath string) string {
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

func (p *Parser) extractEdges(pkg *packages.Package) {
	for _, file := range pkg.Syntax {
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

			p.edges = append(p.edges, ParsedEdge{
				FromNodeID: callerID,
				ToNodeID:   calleeID,
				Kind:       "call",
				Style:      "solid",
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
					receiver := p.receiverType(fn.Recv.List[0].Type)
					enclosing = fmt.Sprintf("%s.(%s).%s", pkg.PkgPath, receiver, fn.Name.Name)
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
				return f.FullName()
			}
		}
	case *ast.SelectorExpr:
		if sel := pkg.TypesInfo.Selections[fn]; sel != nil {
			if f, ok := sel.Obj().(*types.Func); ok {
				recvName := p.extractTypeName(sel.Recv())
				return fmt.Sprintf("%s.(%s).%s", f.Pkg().Path(), recvName, f.Name())
			}
		} else if obj := pkg.TypesInfo.Uses[fn.Sel]; obj != nil {
			if f, ok := obj.(*types.Func); ok {
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
