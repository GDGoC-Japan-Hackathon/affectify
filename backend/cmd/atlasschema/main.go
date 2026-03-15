package main

import (
	"fmt"
	"os"

	"ariga.io/atlas-provider-gorm/gormschema"

	repoentity "github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
)

func main() {
	stmts, err := gormschema.New("postgres").Load(
		&repoentity.User{},
		&repoentity.Team{},
		&repoentity.TeamMember{},
		&repoentity.Project{},
		&repoentity.ProjectShare{},
		&repoentity.Variant{},
		&repoentity.Node{},
		&repoentity.Edge{},
		&repoentity.DesignGuide{},
		&repoentity.DesignGuideLike{},
		&repoentity.AnalysisReport{},
		&repoentity.ActivityLog{},
	)
	if err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "load gorm schema: %v\n", err)
		os.Exit(1)
	}

	_, _ = fmt.Fprintln(os.Stdout, stmts)
}
