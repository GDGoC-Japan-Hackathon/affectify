package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/siraiyuto/affectify/backend/gen/api/v1/apiv1connect"
	"github.com/siraiyuto/affectify/backend/internal/handler"
	"github.com/siraiyuto/affectify/backend/internal/repository"
	"github.com/siraiyuto/affectify/backend/internal/service"
)

func main() {
	// DB接続
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL が設定されていません")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("DB接続失敗: %v", err)
	}

	// 依存関係の組み立て
	healthService := service.NewHealthService()
	healthHandler := handler.NewHealthServiceHandler(healthService)

	boardRepo := repository.NewBoardRepository(db)
	layoutService := service.NewLayoutService(boardRepo)
	boardHandler := handler.NewBoardServiceHandler(layoutService)

	mux := http.NewServeMux()

	path, h := apiv1connect.NewHealthServiceHandler(healthHandler)
	mux.Handle(path, h)

	path, h = apiv1connect.NewBoardServiceHandler(boardHandler)
	mux.Handle(path, h)

	addr := ":8080"
	fmt.Printf("server listening on %s\n", addr)
	log.Fatal(http.ListenAndServe(
		addr,
		h2c.NewHandler(mux, &http2.Server{}),
	))
}
