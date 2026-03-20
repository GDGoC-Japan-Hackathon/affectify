package graphbuild

import (
	"bytes"
	"fmt"
	"go/ast"
	"go/printer"
	"go/token"
	"go/types"
	"log"
	"path/filepath"
	"strings"

	"golang.org/x/tools/go/packages"
	"golang.org/x/tools/go/types/typeutil"
)

type Parser struct {
	fset              *token.FileSet
	pkgs              []*packages.Package
	baseDir           string
	nodeMap           map[string]*ParsedNode
	interfaceMap      map[string]*types.Interface
	receiverMethodIDs map[string][]string
	edgeSet           map[string]struct{}
	callSamples       []string
	callSeen          int
	callerMissing     int
	calleeMissing     int
	callerNodeMissing int
	calleeNodeMissing int
	nodes             []ParsedNode
	edges             []ParsedEdge
}

func NewParser(dir string) *Parser {
	baseDir, err := filepath.Abs(dir)
	if err != nil {
		baseDir = dir
	}

	return &Parser{
		baseDir:           baseDir,
		nodeMap:           make(map[string]*ParsedNode),
		interfaceMap:      make(map[string]*types.Interface),
		receiverMethodIDs: make(map[string][]string),
		edgeSet:           make(map[string]struct{}),
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
	log.Printf("graphbuild: loaded %d packages from %s", len(pkgs), p.baseDir)
	for _, pkg := range pkgs {
		if len(pkg.Errors) == 0 {
			continue
		}
		for _, pkgErr := range pkg.Errors {
			log.Printf("graphbuild: package-error package=%s err=%s", pkg.PkgPath, pkgErr.Msg)
		}
	}

	for _, pkg := range pkgs {
		p.extractNodes(pkg)
	}
	for _, pkg := range pkgs {
		p.extractImplementEdges(pkg)
	}
	for _, pkg := range pkgs {
		p.extractEdges(pkg)
	}

	p.assignPositions()
	p.logSummary()

	return &Board{
		Nodes: p.nodes,
		Edges: p.edges,
	}, nil
}

func (p *Parser) extractNodes(pkg *packages.Package) {
	beforeNodes := len(p.nodes)
	for i, file := range pkg.Syntax {
		relPath := p.relativeFilePath(pkg, i, file)

		ast.Inspect(file, func(n ast.Node) bool {
			if ts, ok := n.(*ast.TypeSpec); ok {
				if _, ok := ts.Type.(*ast.InterfaceType); ok {
					node, iface := p.interfaceTypeToNode(pkg, ts, relPath)
					p.nodes = append(p.nodes, node)
					p.nodeMap[node.ID] = &p.nodes[len(p.nodes)-1]
					if iface != nil {
						p.interfaceMap[node.ID] = iface
					}
				}
				return true
			}

			fn, ok := n.(*ast.FuncDecl)
			if !ok {
				return true
			}

			node := p.funcDeclToNode(pkg, fn, relPath)
			p.nodes = append(p.nodes, node)
			p.nodeMap[node.ID] = &p.nodes[len(p.nodes)-1]
			if node.Kind == "method" && node.Receiver != "" {
				key := fmt.Sprintf("%s.%s", pkg.PkgPath, node.Receiver)
				p.receiverMethodIDs[key] = append(p.receiverMethodIDs[key], node.ID)
			}
			return true
		})
	}
	log.Printf(
		"graphbuild: package=%s extracted_nodes=%d total_nodes=%d",
		pkg.PkgPath,
		len(p.nodes)-beforeNodes,
		len(p.nodes),
	)
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
		return filepath.ToSlash(relPath)
	}
	return filepath.ToSlash(absPath)
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

func (p *Parser) interfaceTypeToNode(pkg *packages.Package, spec *ast.TypeSpec, filePath string) (ParsedNode, *types.Interface) {
	id := fmt.Sprintf("%s.%s", pkg.PkgPath, spec.Name.Name)

	var signature string
	var iface *types.Interface
	if obj := pkg.TypesInfo.Defs[spec.Name]; obj != nil {
		if named, ok := obj.Type().(*types.Named); ok {
			iface, _ = named.Underlying().(*types.Interface)
			signature = types.TypeString(named, func(p *types.Package) string {
				return p.Name()
			})
		}
	}

	return ParsedNode{
		ID:        id,
		Kind:      "interface",
		Title:     spec.Name.Name,
		FilePath:  filePath,
		Signature: signature,
		Layer:     inferLayer(filePath),
		CodeText:  p.extractCodeText(spec),
	}, iface
}

func (p *Parser) extractCodeText(node ast.Node) string {
	var buf bytes.Buffer
	if err := printer.Fprint(&buf, p.fset, node); err != nil {
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
	beforeEdges := len(p.edges)
	for _, file := range pkg.Syntax {
		ast.Inspect(file, func(n ast.Node) bool {
			call, ok := n.(*ast.CallExpr)
			if !ok {
				return true
			}
			p.callSeen++

			callerID := p.findEnclosingFunc(pkg, file, call.Pos())
			if callerID == "" {
				p.callerMissing++
				p.addCallSample(pkg, "missing-caller", call, "", "")
				return true
			}

			calleeID := p.resolveCallee(pkg, call)
			if calleeID == "" || callerID == calleeID {
				p.calleeMissing++
				p.addCallSample(pkg, "missing-callee", call, callerID, calleeID)
				return true
			}

			if _, ok := p.nodeMap[callerID]; !ok {
				p.callerNodeMissing++
				p.addCallSample(pkg, "missing-caller-node", call, callerID, calleeID)
				return true
			}
			if _, ok := p.nodeMap[calleeID]; !ok {
				p.calleeNodeMissing++
				p.addCallSample(pkg, "missing-callee-node", call, callerID, calleeID)
				return true
			}

			p.appendEdge(ParsedEdge{
				FromNodeID: callerID,
				ToNodeID:   calleeID,
				Kind:       "call",
				Style:      "solid",
			})
			return true
		})
	}
	log.Printf(
		"graphbuild: package=%s extracted_edges=%d total_edges=%d",
		pkg.PkgPath,
		len(p.edges)-beforeEdges,
		len(p.edges),
	)
}

func (p *Parser) extractImplementEdges(pkg *packages.Package) {
	scope := pkg.Types.Scope()
	for _, name := range scope.Names() {
		obj := scope.Lookup(name)
		typeName, ok := obj.(*types.TypeName)
		if !ok {
			continue
		}
		named, ok := typeName.Type().(*types.Named)
		if !ok {
			continue
		}

		receiverKey := fmt.Sprintf("%s.%s", pkg.PkgPath, named.Obj().Name())
		methodIDs := p.receiverMethodIDs[receiverKey]
		if len(methodIDs) == 0 {
			continue
		}

		for interfaceNodeID, iface := range p.interfaceMap {
			if !types.Implements(named, iface) && !types.Implements(types.NewPointer(named), iface) {
				continue
			}
			log.Printf(
				"graphbuild: implementation detected package=%s type=%s interface=%s methods=%d",
				pkg.PkgPath,
				named.Obj().Name(),
				interfaceNodeID,
				len(methodIDs),
			)
			for _, methodID := range methodIDs {
				p.appendEdge(ParsedEdge{
					FromNodeID: methodID,
					ToNodeID:   interfaceNodeID,
					Kind:       "implement",
					Style:      "dashed",
				})
			}
		}
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
	fnObj := typeutil.Callee(pkg.TypesInfo, call)
	if fnObj == nil {
		fnObj = p.resolveCalleeFallback(pkg, call.Fun)
	}
	if fnObj == nil {
		return ""
	}

	f, ok := fnObj.(*types.Func)
	if !ok {
		return ""
	}

	sig, _ := f.Type().(*types.Signature)
	if sig == nil || sig.Recv() == nil {
		return f.FullName()
	}

	recvPkgPath, recvName, isInterface := p.extractNamedTypeInfo(sig.Recv().Type())
	if isInterface && recvPkgPath != "" && recvName != "" {
		interfaceNodeID := fmt.Sprintf("%s.%s", recvPkgPath, recvName)
		if _, ok := p.nodeMap[interfaceNodeID]; ok {
			log.Printf(
				"graphbuild: interface selector resolved package=%s selector=%s recv_interface=%s",
				pkg.PkgPath,
				f.Name(),
				interfaceNodeID,
			)
			return interfaceNodeID
		}
		log.Printf(
			"graphbuild: interface selector unresolved package=%s selector=%s recv_interface=%s",
			pkg.PkgPath,
			f.Name(),
			interfaceNodeID,
		)
	}

	if recvPkgPath == "" && f.Pkg() != nil {
		recvPkgPath = f.Pkg().Path()
	}
	if recvPkgPath == "" || recvName == "" {
		return ""
	}
	return fmt.Sprintf("%s.(%s).%s", recvPkgPath, recvName, f.Name())
}

func (p *Parser) resolveCalleeFallback(pkg *packages.Package, expr ast.Expr) types.Object {
	switch fn := expr.(type) {
	case *ast.Ident:
		if obj := pkg.TypesInfo.ObjectOf(fn); obj != nil {
			return obj
		}
		if obj := pkg.TypesInfo.Uses[fn]; obj != nil {
			return obj
		}
	case *ast.SelectorExpr:
		if obj := pkg.TypesInfo.ObjectOf(fn.Sel); obj != nil {
			return obj
		}
		if obj := pkg.TypesInfo.Uses[fn.Sel]; obj != nil {
			return obj
		}
	}
	return nil
}

func (p *Parser) extractNamedTypeInfo(t types.Type) (pkgPath string, name string, isInterface bool) {
	switch typ := t.(type) {
	case *types.Named:
		obj := typ.Obj()
		if obj == nil {
			return "", "", false
		}
		_, isInterface = typ.Underlying().(*types.Interface)
		if obj.Pkg() != nil {
			pkgPath = obj.Pkg().Path()
		}
		return pkgPath, obj.Name(), isInterface
	case *types.Pointer:
		return p.extractNamedTypeInfo(typ.Elem())
	}
	return "", "", false
}

func (p *Parser) appendEdge(edge ParsedEdge) {
	key := fmt.Sprintf("%s|%s|%s", edge.Kind, edge.FromNodeID, edge.ToNodeID)
	if _, exists := p.edgeSet[key]; exists {
		return
	}
	p.edgeSet[key] = struct{}{}
	p.edges = append(p.edges, edge)
}

func (p *Parser) logSummary() {
	nodeKinds := map[string]int{}
	edgeKinds := map[string]int{}
	for _, node := range p.nodes {
		nodeKinds[node.Kind]++
	}
	for _, edge := range p.edges {
		edgeKinds[edge.Kind]++
	}
	log.Printf(
		"graphbuild: summary nodes=%d node_kinds=%v edges=%d edge_kinds=%v calls_seen=%d caller_missing=%d callee_missing=%d caller_node_missing=%d callee_node_missing=%d",
		len(p.nodes),
		nodeKinds,
		len(p.edges),
		edgeKinds,
		p.callSeen,
		p.callerMissing,
		p.calleeMissing,
		p.callerNodeMissing,
		p.calleeNodeMissing,
	)
	for _, sample := range p.callSamples {
		log.Printf("graphbuild: call-sample %s", sample)
	}
}

func (p *Parser) addCallSample(pkg *packages.Package, reason string, call *ast.CallExpr, callerID string, calleeID string) {
	if len(p.callSamples) >= 12 {
		return
	}
	var buf bytes.Buffer
	if err := printer.Fprint(&buf, p.fset, call); err != nil {
		buf.WriteString("<print-error>")
	}
	position := p.fset.Position(call.Pos())
	p.callSamples = append(
		p.callSamples,
		fmt.Sprintf(
			"reason=%s package=%s file=%s line=%d expr=%q caller=%q callee=%q",
			reason,
			pkg.PkgPath,
			p.relToBase(position.Filename),
			position.Line,
			buf.String(),
			callerID,
			calleeID,
		),
	)
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
