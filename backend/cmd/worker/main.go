package main

import (
	"context"
	"log"
	"os"
	"strconv"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/config"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/postgres"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/service"
)

func main() {
	if err := config.LoadEnv(); err != nil {
		log.Printf("warning: could not load .env: %v", err)
	}

	if len(os.Args) < 2 {
		log.Fatal("worker mode is required: graph-build | layout | review | review-apply")
	}

	jobIDText := os.Getenv("JOB_ID")
	if jobIDText == "" {
		log.Fatal("JOB_ID is required")
	}

	jobID, err := strconv.ParseInt(jobIDText, 10, 64)
	if err != nil {
		log.Fatalf("invalid JOB_ID %q: %v", jobIDText, err)
	}

	db, err := postgres.OpenPostgres(config.LoadDatabaseConfig())
	if err != nil {
		log.Fatal(err)
	}

	workerService := service.NewJobWorkerService(db)
	ctx := context.Background()

	switch os.Args[1] {
	case "graph-build":
		err = workerService.RunGraphBuildJob(ctx, jobID)
	case "layout":
		err = workerService.RunLayoutJob(ctx, jobID)
	case "review":
		err = workerService.RunReviewJob(ctx, jobID)
	case "review-apply":
		err = workerService.RunReviewApplyJob(ctx, jobID)
	default:
		log.Fatalf("unsupported worker mode: %s", os.Args[1])
	}

	if err != nil {
		log.Fatal(err)
	}
}
