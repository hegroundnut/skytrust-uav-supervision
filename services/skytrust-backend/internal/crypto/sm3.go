package crypto

import (
	"encoding/hex"

	"github.com/emmansun/gmsm/sm3"
)

func SM3Hex(data []byte) string {
	sum := sm3.Sum(data)
	return hex.EncodeToString(sum[:])
}

func SM3HexCanonical(v any) (string, error) {
	b, err := CanonicalJSON(v)
	if err != nil {
		return "", err
	}
	return SM3Hex(b), nil
}
