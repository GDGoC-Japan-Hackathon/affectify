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
		&repoentity.Project{},
		&repoentity.ProjectMember{},
		&repoentity.Variant{},
		&repoentity.Node{},
		&repoentity.Edge{},
		&repoentity.DesignGuide{},
		&repoentity.DesignGuideLike{},
		&repoentity.AnalysisReport{},
		&repoentity.ActivityLog{},
		&repoentity.VariantFile{},
		&repoentity.VariantDesignGuide{},
		&repoentity.GraphBuildJob{},
		&repoentity.LayoutJob{},
		&repoentity.ReviewJob{},
		&repoentity.ReviewFeedback{},
		&repoentity.ReviewFeedbackTarget{},
		&repoentity.ReviewFeedbackChat{},
		&repoentity.ReviewFeedbackAction{},
		&repoentity.ReviewFeedbackReaction{},
	)
	if err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "load gorm schema: %v\n", err)
		os.Exit(1)
	}

	_, _ = fmt.Fprintln(os.Stdout, stmts)
}
