package main

import (
	"gorm.io/gen"

	repoentity "github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
)

func main() {
	g := gen.NewGenerator(gen.Config{
		OutPath:      "internal/repository/query",
		ModelPkgPath: "github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity",
		Mode:         gen.WithDefaultQuery | gen.WithQueryInterface,
	})

	g.ApplyBasic(
		repoentity.User{},
		repoentity.Project{},
		repoentity.ProjectMember{},
		repoentity.Variant{},
		repoentity.Node{},
		repoentity.Edge{},
		repoentity.DesignGuide{},
		repoentity.DesignGuideLike{},
		repoentity.AnalysisReport{},
		repoentity.ActivityLog{},
		repoentity.VariantFile{},
		repoentity.VariantDesignGuide{},
		repoentity.GraphBuildJob{},
		repoentity.LayoutJob{},
		repoentity.ReviewJob{},
		repoentity.ReviewFeedback{},
		repoentity.ReviewFeedbackTarget{},
		repoentity.ReviewFeedbackChat{},
		repoentity.ReviewFeedbackAction{},
	)

	g.Execute()
}
