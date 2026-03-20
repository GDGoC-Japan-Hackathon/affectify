package repository

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/query"
)

type ReviewRepository struct {
	db *gorm.DB
}

type FeedbackWrite struct {
	Feedback entity.ReviewFeedback
	Targets  []entity.ReviewFeedbackTarget
	Chats    []entity.ReviewFeedbackChat
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

func (r *ReviewRepository) CreateReviewApplyJob(ctx context.Context, job *entity.ReviewApplyJob) error {
	return r.db.WithContext(ctx).Create(job).Error
}

func (r *ReviewRepository) SaveReviewApplyJob(ctx context.Context, job *entity.ReviewApplyJob) error {
	return r.db.WithContext(ctx).Save(job).Error
}

func (r *ReviewRepository) FindReviewApplyJobByID(ctx context.Context, id int64) (*entity.ReviewApplyJob, error) {
	var job entity.ReviewApplyJob
	if err := r.db.WithContext(ctx).First(&job, id).Error; errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	} else if err != nil {
		return nil, err
	}
	return &job, nil
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

func (r *ReviewRepository) SaveFeedback(ctx context.Context, feedback *entity.ReviewFeedback) error {
	q := query.Use(r.db)
	return q.ReviewFeedback.WithContext(ctx).Save(feedback)
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

func (r *ReviewRepository) UpsertFeedbackReaction(ctx context.Context, reaction *entity.ReviewFeedbackReaction) error {
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{
				{Name: "feedback_id"},
				{Name: "user_id"},
			},
			DoUpdates: clause.AssignmentColumns([]string{"reaction", "updated_at"}),
		}).
		Create(reaction).Error
}

func (r *ReviewRepository) FindFeedbackReactionsByUser(ctx context.Context, userID int64, feedbackIDs []int64) (map[int64]string, error) {
	if len(feedbackIDs) == 0 {
		return map[int64]string{}, nil
	}

	var reactions []entity.ReviewFeedbackReaction
	if err := r.db.WithContext(ctx).
		Where("user_id = ? AND feedback_id IN ?", userID, feedbackIDs).
		Find(&reactions).Error; err != nil {
		return nil, err
	}

	result := make(map[int64]string, len(reactions))
	for _, reaction := range reactions {
		result[reaction.FeedbackID] = reaction.Reaction
	}
	return result, nil
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

func (r *ReviewRepository) ReplaceGeneratedReview(
	ctx context.Context,
	variantID int64,
	reviewJobID int64,
	overallScore int32,
	summary string,
	reportData map[string]any,
	analyzedAt time.Time,
	feedbackWrites []FeedbackWrite,
) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("review_job_id = ?", reviewJobID).Delete(&entity.ReviewFeedback{}).Error; err != nil {
			return err
		}
		if err := tx.Where("review_job_id = ?", reviewJobID).Delete(&entity.AnalysisReport{}).Error; err != nil {
			return err
		}

		reportBytes, err := json.Marshal(reportData)
		if err != nil {
			return err
		}
		report := &entity.AnalysisReport{
			VariantID:    variantID,
			ReviewJobID:  &reviewJobID,
			OverallScore: overallScore,
			Summary:      &summary,
			ReportData:   reportBytes,
			AnalyzedAt:   entity.Time(analyzedAt),
		}
		if err := tx.Create(report).Error; err != nil {
			return err
		}

		for _, item := range feedbackWrites {
			feedback := item.Feedback
			if err := tx.Create(&feedback).Error; err != nil {
				return err
			}

			for _, target := range item.Targets {
				target.FeedbackID = feedback.ID
				if err := tx.Create(&target).Error; err != nil {
					return err
				}
			}

			for _, chat := range item.Chats {
				chat.FeedbackID = feedback.ID
				if err := tx.Create(&chat).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})
}

func (r *ReviewRepository) FindLatestAnalysisReportByVariantID(ctx context.Context, variantID int64) (*entity.AnalysisReport, error) {
	q := query.Use(r.db)
	ar := q.AnalysisReport
	report, err := ar.WithContext(ctx).
		Where(ar.VariantID.Eq(variantID)).
		Order(ar.AnalyzedAt.Desc(), ar.ID.Desc()).
		First()
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return report, nil
}
