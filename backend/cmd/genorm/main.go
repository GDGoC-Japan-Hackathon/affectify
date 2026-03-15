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
		repoentity.Team{},
		repoentity.TeamMember{},
		repoentity.Project{},
		repoentity.ProjectShare{},
		repoentity.Variant{},
		repoentity.Node{},
		repoentity.Edge{},
		repoentity.DesignGuide{},
		repoentity.DesignGuideLike{},
		repoentity.AnalysisReport{},
		repoentity.ActivityLog{},
	)

	g.Execute()
}
