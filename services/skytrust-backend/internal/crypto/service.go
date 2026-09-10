package crypto

type Service struct {
	keyDir string
}

func NewService(keyDir string) (*Service, error) {
	return &Service{keyDir: keyDir}, nil
}

func (s *Service) HashCanonical(v any) (string, error) {
	return SM3HexCanonical(v)
}
