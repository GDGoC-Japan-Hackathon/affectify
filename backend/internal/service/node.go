package service

import (
	"context"
	"encoding/json"
	"errors"

	"gorm.io/datatypes"
	"gorm.io/gorm"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
	"google.golang.org/protobuf/types/known/structpb"
)

var ErrNodeNotFound = errors.New("node not found")

type CreateNodeInput struct {
	VariantID     int64
	VariantFileID *int64
	Kind          string
	Title         string
	Signature     string
	Receiver      string
	CodeText      string
	X             float64
	Y             float64
	Metadata      *structpb.Struct
}

type UpdateNodeInput struct {
	ID        int64
	Title     string
	Signature string
	Receiver  string
	CodeText  string
	X         float64
	Y         float64
	Metadata  *structpb.Struct
}

type NodeService struct {
	userRepository *repository.UserRepository
	projectRepo    *repository.ProjectRepository
	variantRepo    *repository.VariantRepository
}

func NewNodeService(db *gorm.DB, userRepository *repository.UserRepository) *NodeService {
	return &NodeService{
		userRepository: userRepository,
		projectRepo:    repository.NewProjectRepository(db),
		variantRepo:    repository.NewVariantRepository(db),
	}
}

func (s *NodeService) ListNodes(ctx context.Context, firebaseUID string, variantID int64) ([]entity.Node, error) {
	if _, _, err := s.requireVariantAccess(ctx, firebaseUID, variantID); err != nil {
		return nil, err
	}
	return s.variantRepo.ListNodesByVariantID(ctx, variantID)
}

func (s *NodeService) CreateNode(ctx context.Context, firebaseUID string, input CreateNodeInput) (*entity.Node, error) {
	if _, _, err := s.requireVariantAccess(ctx, firebaseUID, input.VariantID); err != nil {
		return nil, err
	}

	metadata, err := protoStructToJSON(input.Metadata)
	if err != nil {
		return nil, err
	}

	node := &entity.Node{
		VariantID:     input.VariantID,
		VariantFileID: input.VariantFileID,
		Kind:          entity.NodeKind(input.Kind),
		Title:         input.Title,
		Signature:     optionalString(input.Signature),
		Receiver:      optionalString(input.Receiver),
		CodeText:      optionalString(input.CodeText),
		PositionX:     input.X,
		PositionY:     input.Y,
		Metadata:      metadata,
	}
	if err := s.variantRepo.CreateNode(ctx, node); err != nil {
		return nil, err
	}
	return node, nil
}

func (s *NodeService) UpdateNode(ctx context.Context, firebaseUID string, input UpdateNodeInput) (*entity.Node, error) {
	node, _, err := s.requireNodeAccess(ctx, firebaseUID, input.ID)
	if err != nil {
		return nil, err
	}

	if input.Title != "" {
		node.Title = input.Title
	}
	if input.Signature != "" {
		node.Signature = optionalString(input.Signature)
	}
	if input.Receiver != "" {
		node.Receiver = optionalString(input.Receiver)
	}
	if input.CodeText != "" {
		node.CodeText = optionalString(input.CodeText)
	}
	node.PositionX = input.X
	node.PositionY = input.Y

	if input.Metadata != nil {
		metadata, err := protoStructToJSON(input.Metadata)
		if err != nil {
			return nil, err
		}
		node.Metadata = metadata
	}

	if err := s.variantRepo.SaveNode(ctx, node); err != nil {
		return nil, err
	}
	return node, nil
}

func (s *NodeService) DeleteNode(ctx context.Context, firebaseUID string, id int64) error {
	if _, _, err := s.requireNodeAccess(ctx, firebaseUID, id); err != nil {
		return err
	}
	deleted, err := s.variantRepo.DeleteNodeByID(ctx, id)
	if err != nil {
		return err
	}
	if !deleted {
		return ErrNodeNotFound
	}
	return nil
}

func (s *NodeService) requireUser(ctx context.Context, firebaseUID string) (*entity.User, error) {
	requester, err := s.userRepository.FindByFirebaseUID(ctx, firebaseUID)
	if err != nil {
		return nil, err
	}
	if requester == nil {
		return nil, ErrUserNotFound
	}
	return requester, nil
}

func (s *NodeService) requireVariantAccess(ctx context.Context, firebaseUID string, variantID int64) (*entity.Variant, *entity.User, error) {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return nil, nil, err
	}

	variant, err := s.variantRepo.FindByID(ctx, variantID)
	if err != nil {
		return nil, nil, err
	}
	if variant == nil {
		return nil, nil, ErrVariantNotFound
	}

	hasAccess, err := s.projectRepo.HasAccess(ctx, variant.ProjectID, requester.ID)
	if err != nil {
		return nil, nil, err
	}
	if !hasAccess {
		return nil, nil, ErrForbidden
	}

	return variant, requester, nil
}

func (s *NodeService) requireNodeAccess(ctx context.Context, firebaseUID string, nodeID int64) (*entity.Node, *entity.User, error) {
	node, err := s.variantRepo.FindNodeByID(ctx, nodeID)
	if err != nil {
		return nil, nil, err
	}
	if node == nil {
		return nil, nil, ErrNodeNotFound
	}

	_, requester, err := s.requireVariantAccess(ctx, firebaseUID, node.VariantID)
	if err != nil {
		return nil, nil, err
	}
	return node, requester, nil
}

func protoStructToJSON(metadata *structpb.Struct) (datatypes.JSON, error) {
	if metadata == nil {
		return nil, nil
	}
	body, err := json.Marshal(metadata.AsMap())
	if err != nil {
		return nil, err
	}
	return datatypes.JSON(body), nil
}

func optionalString(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
