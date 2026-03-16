package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	connect "connectrpc.com/connect"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/gen/api/v1/apiv1connect"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/auth"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/config"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/handler"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/handler/middleware"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository"
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

	verifier, err := auth.NewVerifier(context.Background(), config.LoadFirebaseConfig())
	if err != nil {
		log.Fatal(err)
	}

	interceptors := connect.WithInterceptors(auth.NewInterceptor(verifier))

	userRepository := repository.NewUserRepository(db)
	healthService := service.NewHealthService()
	userService := service.NewUserService(userRepository)
	healthHandler := handler.NewHealthServiceHandler(healthService)
	userHandler := handler.NewUserServiceHandler(userService)

	mux := http.NewServeMux()
	healthPath, healthHTTPHandler := apiv1connect.NewHealthServiceHandler(healthHandler, interceptors)
	mux.Handle(healthPath, healthHTTPHandler)
	userPath, userHTTPHandler := apiv1connect.NewUserServiceHandler(userHandler, interceptors)
	mux.Handle(userPath, userHTTPHandler)

	port := config.GetEnv("APP_PORT", "8080")
	addr := ":" + port

	fmt.Printf("server listening on %s\n", addr)
	fmt.Printf("database target: %s:%s\n", dbConfig.Host, dbConfig.Port)
	log.Fatal(http.ListenAndServe(
		addr,
		h2c.NewHandler(middleware.WithCORS(mux), &http2.Server{}),
	))
}
