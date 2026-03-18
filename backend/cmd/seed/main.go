package main

import (
	"context"
	"flag"
	"log"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/config"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/postgres"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/seed"
)

func main() {
	preset := flag.String("preset", "demo", "seed preset to run")
	flag.Parse()

	if err := config.LoadEnv(); err != nil {
		log.Printf("warning: could not load .env: %v", err)
	}

	db, err := postgres.OpenPostgres(config.LoadDatabaseConfig())
	if err != nil {
		log.Fatal(err)
	}

	seeder := seed.New(db)

	switch *preset {
	case "demo":
		if err := seeder.RunDemo(context.Background()); err != nil {
			log.Fatal(err)
		}
	default:
		log.Fatalf("unsupported seed preset: %s", *preset)
	}

	log.Printf("seed preset %q completed", *preset)
}
