FROM golang:1.26.1 AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/server ./cmd/server \
  && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/worker ./cmd/worker

FROM gcr.io/distroless/base-debian12

WORKDIR /app

COPY --from=builder /out/server /app/server
COPY --from=builder /out/worker /app/worker

EXPOSE 8080

ENTRYPOINT ["/app/server"]
