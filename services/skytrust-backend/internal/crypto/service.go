package crypto

type Service struct {
	keyDir string
	sm9    *sm9State
}

func NewService(keyDir string) (*Service, error) {
	st, err := loadOrCreate(keyDir)
	if err != nil {
		return nil, err
	}
	return &Service{keyDir: keyDir, sm9: st}, nil
}

func (s *Service) HashCanonical(v any) (string, error) {
	return SM3HexCanonical(v)
}
