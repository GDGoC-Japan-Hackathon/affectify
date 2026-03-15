package main

import (
	"fmt"
	"log"
	"net/http"

	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/gen/api/v1/apiv1connect"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/config"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/handler"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/postgres"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/service"
)

func main() {
	if err := config.LoadEnv(); err != nil {
		log.Printf("warning: could not load .env: %v", err)
	}

	dbConfig := config.LoadDatabaseConfig()

	db, err := postgres.OpenPostgres(dbConfig)
	if err != nil {
		log.Fatal(err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal(err)
	}

	if err := sqlDB.Ping(); err != nil {
		log.Fatal(err)
	}

	healthService := service.NewHealthService()
	healthHandler := handler.NewHealthServiceHandler(healthService)

	mux := http.NewServeMux()
	path, h := apiv1connect.NewHealthServiceHandler(healthHandler)
	mux.Handle(path, h)

	port := config.GetEnv("APP_PORT", "8080")
	addr := ":" + port

	fmt.Printf("server listening on %s\n", addr)
	fmt.Printf("database target: %s:%s\n", dbConfig.Host, dbConfig.Port)
	log.Fatal(http.ListenAndServe(
		addr,
		h2c.NewHandler(mux, &http2.Server{}),
	))
}
