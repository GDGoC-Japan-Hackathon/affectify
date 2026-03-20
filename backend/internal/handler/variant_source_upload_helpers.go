package handler

import (
	"fmt"
	"io"
)

func fmtSscanf(value string, target *int64) (int, error) {
	return fmt.Sscanf(value, "%d", target)
}

func ioReadAll(reader io.Reader) ([]byte, error) {
	return io.ReadAll(reader)
}
