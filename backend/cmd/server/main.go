package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"github.com/siraiyuto/affectify/backend/gen/api/v1/apiv1connect"
	"github.com/siraiyuto/affectify/backend/internal/handler"
	"github.com/siraiyuto/affectify/backend/internal/repository"
)

func main() {
	// DB接続（環境変数 DATABASE_URL から取得）
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL が設定されていません")
	}
	db, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("DB接続失敗: %v", err)
	}
	defer db.Close()

	// ハンドラの初期化
	healthHandler := &handler.HealthServiceHandler{}
	boardHandler := handler.NewBoardServiceHandler(repository.NewBoardRepository(db))

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
