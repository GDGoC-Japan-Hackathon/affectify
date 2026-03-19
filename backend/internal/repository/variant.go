package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/graphbuild"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/query"
)

type VariantRepository struct {
	db *gorm.DB
}

func NewVariantRepository(db *gorm.DB) *VariantRepository {
	return &VariantRepository{db: db}
}

func (r *VariantRepository) ListByProjectID(ctx context.Context, projectID int64) ([]entity.Variant, error) {
	q := query.Use(r.db)
	v := q.Variant
	result, err := v.WithContext(ctx).
		Where(v.ProjectID.Eq(projectID)).
		Order(v.IsMain.Desc(), v.CreatedAt, v.ID).
		Find()
	if err != nil {
		return nil, err
	}
	variants := make([]entity.Variant, 0, len(result))
	for _, item := range result {
		variants = append(variants, *item)
	}
	return variants, nil
}

func (r *VariantRepository) ListByProjectIDs(ctx context.Context, projectIDs []int64) ([]entity.Variant, error) {
	if len(projectIDs) == 0 {
		return []entity.Variant{}, nil
	}

	q := query.Use(r.db)
	v := q.Variant
	result, err := v.WithContext(ctx).
		Where(v.ProjectID.In(projectIDs...)).
		Order(v.ProjectID, v.IsMain.Desc(), v.CreatedAt, v.ID).
		Find()
	if err != nil {
		return nil, err
	}

	variants := make([]entity.Variant, 0, len(result))
	for _, item := range result {
		variants = append(variants, *item)
	}
	return variants, nil
}

func (r *VariantRepository) FindByID(ctx context.Context, id int64) (*entity.Variant, error) {
	q := query.Use(r.db)
	v := q.Variant
	variant, err := v.WithContext(ctx).Where(v.ID.Eq(id)).First()
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return variant, nil
}

func (r *VariantRepository) Save(ctx context.Context, variant *entity.Variant) error {
	q := query.Use(r.db)
	return q.Variant.WithContext(ctx).Save(variant)
}

func (r *VariantRepository) DeleteByID(ctx context.Context, id int64) (bool, error) {
	q := query.Use(r.db)
	v := q.Variant
	info, err := v.WithContext(ctx).Where(v.ID.Eq(id)).Delete()
	if err != nil {
		return false, err
	}
	return info.RowsAffected > 0, nil
}

func (r *VariantRepository) ListFilesByVariantID(ctx context.Context, variantID int64) ([]entity.VariantFile, error) {
	q := query.Use(r.db)
	vf := q.VariantFile
	result, err := vf.WithContext(ctx).
		Where(vf.VariantID.Eq(variantID)).
		Order(vf.DisplayOrder, vf.Path, vf.ID).
		Find()
	if err != nil {
		return nil, err
	}
	files := make([]entity.VariantFile, 0, len(result))
	for _, item := range result {
		files = append(files, *item)
	}
	return files, nil
}

func (r *VariantRepository) FindDesignGuideByVariantID(ctx context.Context, variantID int64) (*entity.VariantDesignGuide, error) {
	q := query.Use(r.db)
	vdg := q.VariantDesignGuide
	designGuide, err := vdg.WithContext(ctx).
		Where(vdg.VariantID.Eq(variantID)).
		First()
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return designGuide, nil
}

func (r *VariantRepository) ListNodesByVariantID(ctx context.Context, variantID int64) ([]entity.Node, error) {
	q := query.Use(r.db)
	n := q.Node
	result, err := n.WithContext(ctx).
		Where(n.VariantID.Eq(variantID)).
		Order(n.CreatedAt, n.ID).
		Find()
	if err != nil {
		return nil, err
	}
	nodes := make([]entity.Node, 0, len(result))
	for _, item := range result {
		nodes = append(nodes, *item)
	}
	return nodes, nil
}

func (r *VariantRepository) ListEdgesByVariantID(ctx context.Context, variantID int64) ([]entity.Edge, error) {
	q := query.Use(r.db)
	e := q.Edge
	result, err := e.WithContext(ctx).
		Where(e.VariantID.Eq(variantID)).
		Order(e.CreatedAt, e.ID).
		Find()
	if err != nil {
		return nil, err
	}
	edges := make([]entity.Edge, 0, len(result))
	for _, item := range result {
		edges = append(edges, *item)
	}
	return edges, nil
}

func (r *VariantRepository) CountNodesByVariantIDs(ctx context.Context, variantIDs []int64) (map[int64]int32, error) {
	var rows []struct {
		VariantID int64
		Count     int64
	}
	if len(variantIDs) == 0 {
		return map[int64]int32{}, nil
	}

	q := query.Use(r.db)
	n := q.Node
	err := n.WithContext(ctx).
		Select(n.VariantID, n.ID.Count().As("count")).
		Where(n.VariantID.In(variantIDs...)).
		Group(n.VariantID).
		Scan(&rows)
	if err != nil {
		return nil, err
	}

	countByVariantID := make(map[int64]int32, len(rows))
	for _, row := range rows {
		countByVariantID[row.VariantID] = int32(row.Count)
	}
	return countByVariantID, nil
}

func (r *VariantRepository) ListCreatorsByIDs(ctx context.Context, userIDs []int64) (map[int64]*entity.User, error) {
	var users []entity.User
	if len(userIDs) == 0 {
		return map[int64]*entity.User{}, nil
	}
	q := query.Use(r.db)
	u := q.User
	items, err := u.WithContext(ctx).Where(u.ID.In(userIDs...)).Find()
	if err != nil {
		return nil, err
	}
	for _, item := range items {
		users = append(users, *item)
	}

	creatorByID := make(map[int64]*entity.User, len(users))
	for i := range users {
		user := users[i]
		creatorByID[user.ID] = &user
	}
	return creatorByID, nil
}

func (r *VariantRepository) CreateGraphBuildJob(ctx context.Context, job *entity.GraphBuildJob) error {
	q := query.Use(r.db)
	return q.GraphBuildJob.WithContext(ctx).Create(job)
}

func (r *VariantRepository) SaveGraphBuildJob(ctx context.Context, job *entity.GraphBuildJob) error {
	q := query.Use(r.db)
	return q.GraphBuildJob.WithContext(ctx).Save(job)
}

func (r *VariantRepository) FindGraphBuildJobByID(ctx context.Context, id int64) (*entity.GraphBuildJob, error) {
	q := query.Use(r.db)
	j := q.GraphBuildJob
	job, err := j.WithContext(ctx).Where(j.ID.Eq(id)).First()
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return job, nil
}

func (r *VariantRepository) CreateLayoutJob(ctx context.Context, job *entity.LayoutJob) error {
	q := query.Use(r.db)
	return q.LayoutJob.WithContext(ctx).Create(job)
}

func (r *VariantRepository) SaveLayoutJob(ctx context.Context, job *entity.LayoutJob) error {
	q := query.Use(r.db)
	return q.LayoutJob.WithContext(ctx).Save(job)
}

func (r *VariantRepository) FindLayoutJobByID(ctx context.Context, id int64) (*entity.LayoutJob, error) {
	q := query.Use(r.db)
	j := q.LayoutJob
	job, err := j.WithContext(ctx).Where(j.ID.Eq(id)).First()
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return job, nil
}

func (r *VariantRepository) ApplyNodePositions(ctx context.Context, variantID int64, positions map[int64][2]float64) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for nodeID, position := range positions {
			result := tx.Model(&entity.Node{}).
				Where("id = ? AND variant_id = ?", nodeID, variantID).
				Updates(map[string]any{
					"position_x": position[0],
					"position_y": position[1],
				})
			if result.Error != nil {
				return result.Error
			}
		}
		return nil
	})
}

func (r *VariantRepository) SyncParsedGraph(
	ctx context.Context,
	variantID int64,
	importedAt time.Time,
	files []string,
	board *graphbuild.Board,
) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var variant entity.Variant
		if err := tx.First(&variant, variantID).Error; err != nil {
			return err
		}

		var existingFiles []entity.VariantFile
		if err := tx.Where("variant_id = ?", variantID).Find(&existingFiles).Error; err != nil {
			return err
		}
		fileByPath := make(map[string]*entity.VariantFile, len(existingFiles))
		for i := range existingFiles {
			file := existingFiles[i]
			fileByPath[file.Path] = &file
		}

		fileNodeCounts := make(map[string]int32)
		for _, node := range board.Nodes {
			fileNodeCounts[node.FilePath]++
		}

		retainedFileIDs := make(map[int64]struct{})
		fileIDByPath := make(map[string]int64, len(files))
		for _, path := range files {
			if existing, ok := fileByPath[path]; ok {
				existing.NodeCount = fileNodeCounts[path]
				if err := tx.Model(&entity.VariantFile{}).
					Where("id = ?", existing.ID).
					Updates(map[string]any{
						"node_count": existing.NodeCount,
						"language":   repositoryLanguageFromPath(path),
						"updated_at": importedAt,
					}).Error; err != nil {
					return err
				}
				retainedFileIDs[existing.ID] = struct{}{}
				fileIDByPath[path] = existing.ID
				continue
			}

			language := repositoryLanguageFromPath(path)
			file := &entity.VariantFile{
				VariantID:    variantID,
				Path:         path,
				Language:     &language,
				NodeCount:    fileNodeCounts[path],
				IsVisible:    true,
				DisplayOrder: int32(len(fileIDByPath)),
			}
			if err := tx.Create(file).Error; err != nil {
				return err
			}
			retainedFileIDs[file.ID] = struct{}{}
			fileIDByPath[path] = file.ID
		}

		for _, file := range existingFiles {
			if _, ok := retainedFileIDs[file.ID]; ok {
				continue
			}
			if err := tx.Where("variant_file_id = ?", file.ID).Delete(&entity.Node{}).Error; err != nil {
				return err
			}
			if err := tx.Delete(&entity.VariantFile{}, file.ID).Error; err != nil {
				return err
			}
		}

		var existingNodes []entity.Node
		if err := tx.Where("variant_id = ?", variantID).Find(&existingNodes).Error; err != nil {
			return err
		}
		existingNodeByKey := make(map[string]*entity.Node, len(existingNodes))
		for i := range existingNodes {
			node := existingNodes[i]
			key := repositoryNodeIdentityKey(node.VariantFileID, node.Kind, node.Title, node.Receiver)
			existingNodeByKey[key] = &node
		}

		retainedNodeIDs := make(map[int64]struct{}, len(board.Nodes))
		nodeDBIDByParsedID := make(map[string]int64, len(board.Nodes))
		for _, parsedNode := range board.Nodes {
			variantFileID, ok := fileIDByPath[parsedNode.FilePath]
			if !ok {
				return fmt.Errorf("variant file missing for parsed path %s", parsedNode.FilePath)
			}

			variantFileIDCopy := variantFileID
			receiver := repositoryStringPointer(parsedNode.Receiver)
			signature := repositoryStringPointer(parsedNode.Signature)
			codeText := repositoryStringPointer(parsedNode.CodeText)

			metadataJSON, err := json.Marshal(map[string]any{
				"layer": parsedNode.Layer,
			})
			if err != nil {
				return err
			}

			key := repositoryNodeIdentityKey(&variantFileIDCopy, entity.NodeKind(parsedNode.Kind), parsedNode.Title, receiver)
			if existing, ok := existingNodeByKey[key]; ok {
				retainedNodeIDs[existing.ID] = struct{}{}
				nodeDBIDByParsedID[parsedNode.ID] = existing.ID
				if err := tx.Model(&entity.Node{}).Where("id = ?", existing.ID).Updates(map[string]any{
					"signature":  signature,
					"receiver":   receiver,
					"code_text":  codeText,
					"metadata":   metadataJSON,
					"updated_at": importedAt,
				}).Error; err != nil {
					return err
				}
				continue
			}

			node := &entity.Node{
				VariantID:     variantID,
				VariantFileID: &variantFileIDCopy,
				Kind:          entity.NodeKind(parsedNode.Kind),
				Title:         parsedNode.Title,
				Signature:     signature,
				Receiver:      receiver,
				CodeText:      codeText,
				PositionX:     parsedNode.X,
				PositionY:     parsedNode.Y,
				Metadata:      metadataJSON,
			}
			if err := tx.Create(node).Error; err != nil {
				return err
			}
			retainedNodeIDs[node.ID] = struct{}{}
			nodeDBIDByParsedID[parsedNode.ID] = node.ID
		}

		for _, node := range existingNodes {
			if _, ok := retainedNodeIDs[node.ID]; ok {
				continue
			}
			if err := tx.Delete(&entity.Node{}, node.ID).Error; err != nil {
				return err
			}
		}

		if err := tx.Where("variant_id = ?", variantID).Delete(&entity.Edge{}).Error; err != nil {
			return err
		}

		seenEdges := make(map[string]struct{}, len(board.Edges))
		for _, parsedEdge := range board.Edges {
			fromNodeID, okFrom := nodeDBIDByParsedID[parsedEdge.FromNodeID]
			toNodeID, okTo := nodeDBIDByParsedID[parsedEdge.ToNodeID]
			if !okFrom || !okTo {
				continue
			}

			key := fmt.Sprintf("%d:%d:%s", fromNodeID, toNodeID, parsedEdge.Kind)
			if _, seen := seenEdges[key]; seen {
				continue
			}
			seenEdges[key] = struct{}{}

			edge := &entity.Edge{
				VariantID:  variantID,
				FromNodeID: fromNodeID,
				ToNodeID:   toNodeID,
				Kind:       entity.EdgeKind(parsedEdge.Kind),
				Style:      entity.EdgeStyle(parsedEdge.Style),
			}
			if err := tx.Create(edge).Error; err != nil {
				return err
			}
		}

		variant.LastImportedAt = (*entity.Time)(&importedAt)
		return tx.Save(&variant).Error
	})
}

func (r *VariantRepository) UpdateLastReviewedAt(ctx context.Context, variantID int64, reviewedAt time.Time) error {
	return r.db.WithContext(ctx).
		Model(&entity.Variant{}).
		Where("id = ?", variantID).
		Update("last_reviewed_at", reviewedAt).Error
}

func repositoryNodeIdentityKey(variantFileID *int64, kind entity.NodeKind, title string, receiver *string) string {
	filePart := "nil"
	if variantFileID != nil {
		filePart = fmt.Sprintf("%d", *variantFileID)
	}
	return fmt.Sprintf("%s|%s|%s|%s", filePart, kind, title, repositoryStringValue(receiver))
}

func repositoryStringPointer(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

func repositoryStringValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func repositoryLanguageFromPath(path string) string {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".go":
		return "go"
	case ".ts":
		return "typescript"
	case ".tsx":
		return "tsx"
	case ".js":
		return "javascript"
	case ".jsx":
		return "jsx"
	default:
		return ""
	}
}
