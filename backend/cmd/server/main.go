package main

import (
	"fmt"
	"log"
	"net/http"

	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"github.com/siraiyuto/affectify/backend/gen/api/v1/apiv1connect"
	"github.com/siraiyuto/affectify/backend/internal/handler"
)

func main() {
	healthHandler := &handler.HealthServiceHandler{}

	mux := http.NewServeMux()
	path, h := apiv1connect.NewHealthServiceHandler(healthHandler)
	mux.Handle(path, h)

	addr := ":8080"
	fmt.Printf("server listening on %s\n", addr)
	log.Fatal(http.ListenAndServe(
		addr,
		h2c.NewHandler(mux, &http2.Server{}),
	))
}
