package handler

import (
	"context"
	"errors"

	connect "connectrpc.com/connect"

	apiv1 "github.com/GDGoC-Japan-Hackathon/affectify/backend/gen/api/v1"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/gen/api/v1/apiv1connect"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/auth"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/service"
)

type ReviewServiceHandler struct {
	apiv1connect.UnimplementedReviewServiceHandler
	reviewService *service.ReviewService
}

func NewReviewServiceHandler(reviewService *service.ReviewService) *ReviewServiceHandler {
	return &ReviewServiceHandler{reviewService: reviewService}
}

func (h *ReviewServiceHandler) CreateReviewJob(
	ctx context.Context,
	req *connect.Request[apiv1.CreateReviewJobRequest],
) (*connect.Response[apiv1.CreateReviewJobResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	job, err := h.reviewService.CreateReviewJob(ctx, identity.UID, req.Msg.VariantId)
	if err != nil {
		return nil, mapReviewError(err)
	}

	return connect.NewResponse(&apiv1.CreateReviewJobResponse{
		Job: toProtoReviewJob(job),
	}), nil
}

func (h *ReviewServiceHandler) GetReviewJob(
	ctx context.Context,
	req *connect.Request[apiv1.GetReviewJobRequest],
) (*connect.Response[apiv1.GetReviewJobResponse], error) {
	if _, err := auth.RequireIdentity(ctx); err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	job, err := h.reviewService.GetReviewJob(ctx, req.Msg.Id)
	if err != nil {
		return nil, mapReviewError(err)
	}

	return connect.NewResponse(&apiv1.GetReviewJobResponse{
		Job: toProtoReviewJob(job),
	}), nil
}

func (h *ReviewServiceHandler) ListReviewFeedbacks(
	ctx context.Context,
	req *connect.Request[apiv1.ListReviewFeedbacksRequest],
) (*connect.Response[apiv1.ListReviewFeedbacksResponse], error) {
	if _, err := auth.RequireIdentity(ctx); err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	bundle, err := h.reviewService.ListReviewFeedbacks(ctx, service.ListReviewFeedbacksInput{
		VariantID:   req.Msg.VariantId,
		ReviewJobID: req.Msg.ReviewJobId,
		OnlyOpen:    req.Msg.OnlyOpen,
	})
	if err != nil {
		return nil, mapReviewError(err)
	}

	feedbacks := make([]*apiv1.ReviewFeedback, 0, len(bundle.Feedbacks))
	for i := range bundle.Feedbacks {
		feedbacks = append(feedbacks, toProtoReviewFeedback(&bundle.Feedbacks[i]))
	}

	targets := make([]*apiv1.ReviewFeedbackTarget, 0, len(bundle.Targets))
	for i := range bundle.Targets {
		targets = append(targets, toProtoReviewFeedbackTarget(&bundle.Targets[i]))
	}

	return connect.NewResponse(&apiv1.ListReviewFeedbacksResponse{
		Feedbacks: feedbacks,
		Targets:   targets,
	}), nil
}

func (h *ReviewServiceHandler) ListReviewFeedbackChats(
	ctx context.Context,
	req *connect.Request[apiv1.ListReviewFeedbackChatsRequest],
) (*connect.Response[apiv1.ListReviewFeedbackChatsResponse], error) {
	if _, err := auth.RequireIdentity(ctx); err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	chats, err := h.reviewService.ListReviewFeedbackChats(ctx, req.Msg.FeedbackId)
	if err != nil {
		return nil, mapReviewError(err)
	}

	items := make([]*apiv1.ReviewFeedbackChat, 0, len(chats))
	for i := range chats {
		items = append(items, toProtoReviewFeedbackChat(&chats[i]))
	}

	return connect.NewResponse(&apiv1.ListReviewFeedbackChatsResponse{
		Chats: items,
	}), nil
}

func (h *ReviewServiceHandler) AppendReviewFeedbackChat(
	ctx context.Context,
	req *connect.Request[apiv1.AppendReviewFeedbackChatRequest],
) (*connect.Response[apiv1.AppendReviewFeedbackChatResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	chats, feedback, err := h.reviewService.AppendReviewFeedbackChat(ctx, identity.UID, req.Msg.FeedbackId, req.Msg.Content)
	if err != nil {
		return nil, mapReviewError(err)
	}

	items := make([]*apiv1.ReviewFeedbackChat, 0, len(chats))
	for i := range chats {
		items = append(items, toProtoReviewFeedbackChat(&chats[i]))
	}

	return connect.NewResponse(&apiv1.AppendReviewFeedbackChatResponse{
		Chats:    items,
		Feedback: toProtoReviewFeedback(feedback),
	}), nil
}

func (h *ReviewServiceHandler) ResolveReviewFeedback(
	ctx context.Context,
	req *connect.Request[apiv1.ResolveReviewFeedbackRequest],
) (*connect.Response[apiv1.ResolveReviewFeedbackResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	feedback, err := h.reviewService.ResolveReviewFeedback(ctx, identity.UID, service.ResolveReviewFeedbackInput{
		FeedbackID: req.Msg.FeedbackId,
		Resolution: req.Msg.Resolution,
		Status:     req.Msg.Status,
	})
	if err != nil {
		return nil, mapReviewError(err)
	}

	return connect.NewResponse(&apiv1.ResolveReviewFeedbackResponse{
		Feedback: toProtoReviewFeedback(feedback),
	}), nil
}

func mapReviewError(err error) error {
	switch {
	case errors.Is(err, service.ErrReviewJobNotFound),
		errors.Is(err, service.ErrFeedbackNotFound),
		errors.Is(err, service.ErrVariantNotFound):
		return connect.NewError(connect.CodeNotFound, err)
	case errors.Is(err, service.ErrUserNotFound):
		return connect.NewError(connect.CodeFailedPrecondition, err)
	default:
		return connect.NewError(connect.CodeInternal, err)
	}
}
