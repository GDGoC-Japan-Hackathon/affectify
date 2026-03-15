data "external_schema" "gorm" {
  program = [
    "go",
    "run",
    "./cmd/atlasschema",
  ]
}

env "local" {
  src = data.external_schema.gorm.url
  dev = "docker://postgres/17/dev?search_path=public"
  url = "postgres://postgres:postgres@localhost:5433/affectify?sslmode=disable"

  migration {
    dir = "file://migrations"
  }
}
