package repository

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/query"
)

type ReviewRepository struct {
	db *gorm.DB
}

func NewReviewRepository(db *gorm.DB) *ReviewRepository {
	return &ReviewRepository{db: db}
}

func (r *ReviewRepository) CreateReviewJob(ctx context.Context, job *entity.ReviewJob) error {
	q := query.Use(r.db)
	return q.ReviewJob.WithContext(ctx).Create(job)
}

func (r *ReviewRepository) SaveReviewJob(ctx context.Context, job *entity.ReviewJob) error {
	q := query.Use(r.db)
	return q.ReviewJob.WithContext(ctx).Save(job)
}

func (r *ReviewRepository) FindReviewJobByID(ctx context.Context, id int64) (*entity.ReviewJob, error) {
	q := query.Use(r.db)
	rj := q.ReviewJob
	job, err := rj.WithContext(ctx).Where(rj.ID.Eq(id)).First()
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return job, nil
}

func (r *ReviewRepository) FindLatestReviewJobByVariantID(ctx context.Context, variantID int64) (*entity.ReviewJob, error) {
	q := query.Use(r.db)
	rj := q.ReviewJob
	job, err := rj.WithContext(ctx).
		Where(rj.VariantID.Eq(variantID)).
		Order(rj.CreatedAt.Desc(), rj.ID.Desc()).
		First()
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return job, nil
}

func (r *ReviewRepository) ListFeedbacksByVariantAndJob(
	ctx context.Context,
	variantID int64,
	reviewJobID int64,
	onlyOpen bool,
) ([]entity.ReviewFeedback, error) {
	q := query.Use(r.db)
	rf := q.ReviewFeedback
	queryDo := rf.WithContext(ctx).
		Where(rf.VariantID.Eq(variantID), rf.ReviewJobID.Eq(reviewJobID)).
		Order(rf.DisplayOrder, rf.CreatedAt, rf.ID)
	if onlyOpen {
		queryDo = queryDo.Where(rf.Status.Eq(string(entity.FeedbackStatusOpen)))
	}

	result, err := queryDo.Find()
	if err != nil {
		return nil, err
	}
	feedbacks := make([]entity.ReviewFeedback, 0, len(result))
	for _, item := range result {
		feedbacks = append(feedbacks, *item)
	}
	return feedbacks, nil
}

func (r *ReviewRepository) ListFeedbackTargetsByFeedbackIDs(ctx context.Context, feedbackIDs []int64) ([]entity.ReviewFeedbackTarget, error) {
	if len(feedbackIDs) == 0 {
		return []entity.ReviewFeedbackTarget{}, nil
	}
	q := query.Use(r.db)
	rft := q.ReviewFeedbackTarget
	result, err := rft.WithContext(ctx).
		Where(rft.FeedbackID.In(feedbackIDs...)).
		Order(rft.ID).
		Find()
	if err != nil {
		return nil, err
	}
	targets := make([]entity.ReviewFeedbackTarget, 0, len(result))
	for _, item := range result {
		targets = append(targets, *item)
	}
	return targets, nil
}

func (r *ReviewRepository) FindFeedbackByID(ctx context.Context, id int64) (*entity.ReviewFeedback, error) {
	q := query.Use(r.db)
	rf := q.ReviewFeedback
	feedback, err := rf.WithContext(ctx).Where(rf.ID.Eq(id)).First()
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return feedback, nil
}

func (r *ReviewRepository) ListFeedbackChatsByFeedbackID(ctx context.Context, feedbackID int64) ([]entity.ReviewFeedbackChat, error) {
	q := query.Use(r.db)
	rfc := q.ReviewFeedbackChat
	result, err := rfc.WithContext(ctx).
		Where(rfc.FeedbackID.Eq(feedbackID)).
		Order(rfc.CreatedAt, rfc.ID).
		Find()
	if err != nil {
		return nil, err
	}
	chats := make([]entity.ReviewFeedbackChat, 0, len(result))
	for _, item := range result {
		chats = append(chats, *item)
	}
	return chats, nil
}

func (r *ReviewRepository) CreateFeedbackChat(ctx context.Context, chat *entity.ReviewFeedbackChat) error {
	q := query.Use(r.db)
	return q.ReviewFeedbackChat.WithContext(ctx).Create(chat)
}

func (r *ReviewRepository) CreatePlaceholderAnalysisReport(
	ctx context.Context,
	variantID int64,
	reviewJobID int64,
	analyzedAt time.Time,
) error {
	report := &entity.AnalysisReport{
		VariantID:    variantID,
		ReviewJobID:  &reviewJobID,
		OverallScore: 0,
		Summary:      nil,
		ReportData:   []byte(`{"status":"placeholder"}`),
		AnalyzedAt:   entity.Time(analyzedAt),
	}
	q := query.Use(r.db)
	return q.AnalysisReport.WithContext(ctx).Create(report)
}
