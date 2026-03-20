package seed

import (
	"context"
	"fmt"
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
)

type Seeder struct {
	db *gorm.DB
}

func New(db *gorm.DB) *Seeder {
	return &Seeder{db: db}
}

func (s *Seeder) RunDemo(ctx context.Context) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		now := time.Now().UTC()

		ownerAvatar := "https://api.dicebear.com/9.x/shapes/svg?seed=owner"
		memberAvatar := "https://api.dicebear.com/9.x/shapes/svg?seed=member"
		projectDescription := "AI による設計レビューと比較を試せるデモ用プロジェクト"
		mainDescription := "責務分離を優先したメイン案"
		altDescription := "集約度を高めた比較用の別案"
		guideDescription := "設計案レビューの観点をまとめたデモ用ガイド"
		guideContent := "# Demo Design Guide\n\n- handler / service / repository を分離する\n- 循環依存を避ける\n- 境界を跨ぐ型変換を限定する"
		reportData := datatypes.JSON([]byte(`{"summary":"デモ用の分析レポート","highlights":["責務分離","依存関係の明確化"]}`))

		owner := entity.User{
			FirebaseUID: "demo-owner",
			Email:       "demo-owner@example.com",
			Name:        "Demo Owner",
			AvatarURL:   &ownerAvatar,
			LastLoginAt: &now,
		}
		if err := tx.Where(entity.User{FirebaseUID: owner.FirebaseUID}).FirstOrCreate(&owner).Error; err != nil {
			return fmt.Errorf("seed owner user: %w", err)
		}

		member := entity.User{
			FirebaseUID: "demo-member",
			Email:       "demo-member@example.com",
			Name:        "Demo Member",
			AvatarURL:   &memberAvatar,
			LastLoginAt: &now,
		}
		if err := tx.Where(entity.User{FirebaseUID: member.FirebaseUID}).FirstOrCreate(&member).Error; err != nil {
			return fmt.Errorf("seed member user: %w", err)
		}

		project := entity.Project{
			Name:        "Demo Workspace Project",
			Description: &projectDescription,
			OwnerID:     owner.ID,
		}
		if err := tx.Where("owner_id = ? AND name = ?", owner.ID, project.Name).FirstOrCreate(&project).Error; err != nil {
			return fmt.Errorf("seed project: %w", err)
		}

		members := []entity.ProjectMember{
			{ProjectID: project.ID, UserID: owner.ID, AddedBy: owner.ID, JoinedAt: now},
			{ProjectID: project.ID, UserID: member.ID, AddedBy: owner.ID, JoinedAt: now},
		}
		if err := tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "project_id"}, {Name: "user_id"}},
			DoNothing: true,
		}).Create(&members).Error; err != nil {
			return fmt.Errorf("seed project members: %w", err)
		}

		guide := entity.DesignGuide{
			Name:        "Demo Design Review Guide",
			Description: &guideDescription,
			Content:     guideContent,
			CreatedBy:   owner.ID,
		}
		if err := tx.Where("created_by = ? AND name = ?", owner.ID, guide.Name).FirstOrCreate(&guide).Error; err != nil {
			return fmt.Errorf("seed design guide: %w", err)
		}

		mainScore := int32(92)
		mainVariant := entity.Variant{
			ProjectID:     project.ID,
			Name:          "Main Variant",
			Description:   &mainDescription,
			IsMain:        true,
			AnalysisScore: &mainScore,
			CreatedBy:     owner.ID,
		}
		if err := tx.Where("project_id = ? AND name = ?", project.ID, mainVariant.Name).FirstOrCreate(&mainVariant).Error; err != nil {
			return fmt.Errorf("seed main variant: %w", err)
		}

		altScore := int32(78)
		altVariant := entity.Variant{
			ProjectID:           project.ID,
			Name:                "Comparison Variant",
			Description:         &altDescription,
			IsMain:              false,
			ForkedFromVariantID: &mainVariant.ID,
			AnalysisScore:       &altScore,
			CreatedBy:           member.ID,
		}
		if err := tx.Where("project_id = ? AND name = ?", project.ID, altVariant.Name).FirstOrCreate(&altVariant).Error; err != nil {
			return fmt.Errorf("seed comparison variant: %w", err)
		}

		variantGuides := []entity.VariantDesignGuide{
			{
				VariantID:         mainVariant.ID,
				BaseDesignGuideID: &guide.ID,
				Title:             guide.Name,
				Description:       guide.Description,
				Content:           guide.Content,
				Version:           1,
				CreatedBy:         owner.ID,
			},
			{
				VariantID:         altVariant.ID,
				BaseDesignGuideID: &guide.ID,
				Title:             guide.Name,
				Description:       guide.Description,
				Content:           guide.Content,
				Version:           1,
				CreatedBy:         member.ID,
			},
		}
		for _, variantGuide := range variantGuides {
			if err := tx.Where("variant_id = ?", variantGuide.VariantID).FirstOrCreate(&variantGuide).Error; err != nil {
				return fmt.Errorf("seed variant design guide: %w", err)
			}
		}

		mainNodes, err := seedVariantGraph(tx, mainVariant.ID, []graphNodeSeed{
			{
				Title:    "SyncMeHandler",
				Kind:     entity.NodeKindMethod,
				FilePath: "internal/handler/user.go",
			},
			{
				Title:    "UserService",
				Kind:     entity.NodeKindMethod,
				FilePath: "internal/service/user.go",
			},
			{
				Title:    "UserRepository",
				Kind:     entity.NodeKindInterface,
				FilePath: "internal/repository/user.go",
			},
		})
		if err != nil {
			return fmt.Errorf("seed main variant nodes: %w", err)
		}

		if err := seedEdges(tx, mainVariant.ID, []graphEdgeSeed{
			{FromTitle: "SyncMeHandler", ToTitle: "UserService", Kind: entity.EdgeKindCall},
			{FromTitle: "UserService", ToTitle: "UserRepository", Kind: entity.EdgeKindImplement},
		}, mainNodes); err != nil {
			return fmt.Errorf("seed main variant edges: %w", err)
		}

		altNodes, err := seedVariantGraph(tx, altVariant.ID, []graphNodeSeed{
			{
				Title:    "WorkspaceFacade",
				Kind:     entity.NodeKindMethod,
				FilePath: "internal/service/workspace.go",
			},
			{
				Title:    "UserRepository",
				Kind:     entity.NodeKindInterface,
				FilePath: "internal/repository/user.go",
			},
		})
		if err != nil {
			return fmt.Errorf("seed comparison variant nodes: %w", err)
		}

		if err := seedEdges(tx, altVariant.ID, []graphEdgeSeed{
			{FromTitle: "WorkspaceFacade", ToTitle: "UserRepository", Kind: entity.EdgeKindCall},
		}, altNodes); err != nil {
			return fmt.Errorf("seed comparison variant edges: %w", err)
		}

		reports := []entity.AnalysisReport{
			{VariantID: mainVariant.ID, OverallScore: mainScore, ReportData: reportData, AnalyzedAt: now},
			{VariantID: altVariant.ID, OverallScore: altScore, ReportData: reportData, AnalyzedAt: now},
		}
		for _, report := range reports {
			existing := entity.AnalysisReport{}
			if err := tx.Where("variant_id = ?", report.VariantID).First(&existing).Error; err != nil {
				if err != gorm.ErrRecordNotFound {
					return fmt.Errorf("lookup analysis report: %w", err)
				}
				if err := tx.Create(&report).Error; err != nil {
					return fmt.Errorf("seed analysis report: %w", err)
				}
				continue
			}
		}

		return nil
	})
}

type graphNodeSeed struct {
	Title    string
	Kind     entity.NodeKind
	FilePath string
}

type graphEdgeSeed struct {
	FromTitle string
	ToTitle   string
	Kind      entity.EdgeKind
}

func seedVariantGraph(tx *gorm.DB, variantID int64, seeds []graphNodeSeed) (map[string]entity.Node, error) {
	nodes := make(map[string]entity.Node, len(seeds))
	files := make(map[string]entity.VariantFile)

	for _, seed := range seeds {
		variantFile, ok := files[seed.FilePath]
		if !ok {
			language := "go"
			variantFile = entity.VariantFile{
				VariantID: variantID,
				Path:      seed.FilePath,
				Language:  &language,
			}
			if err := tx.Where("variant_id = ? AND path = ?", variantID, seed.FilePath).FirstOrCreate(&variantFile).Error; err != nil {
				return nil, err
			}
			files[seed.FilePath] = variantFile
		}

		node := entity.Node{
			VariantID:     variantID,
			VariantFileID: &variantFile.ID,
			Kind:          seed.Kind,
			Title:         seed.Title,
		}

		if err := tx.Where("variant_id = ? AND title = ? AND kind = ?", variantID, seed.Title, seed.Kind).FirstOrCreate(&node).Error; err != nil {
			return nil, err
		}

		nodes[seed.Title] = node
	}

	return nodes, nil
}

func seedEdges(tx *gorm.DB, variantID int64, seeds []graphEdgeSeed, nodes map[string]entity.Node) error {
	for _, seed := range seeds {
		fromNode, ok := nodes[seed.FromTitle]
		if !ok {
			return fmt.Errorf("missing from node %q", seed.FromTitle)
		}
		toNode, ok := nodes[seed.ToTitle]
		if !ok {
			return fmt.Errorf("missing to node %q", seed.ToTitle)
		}

		edge := entity.Edge{
			VariantID:  variantID,
			FromNodeID: fromNode.ID,
			ToNodeID:   toNode.ID,
			Kind:       seed.Kind,
			Style:      entity.EdgeStyleSolid,
		}
		if err := tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "variant_id"}, {Name: "from_node_id"}, {Name: "to_node_id"}, {Name: "kind"}},
			DoNothing: true,
		}).Create(&edge).Error; err != nil {
			return err
		}
	}

	return nil
}
