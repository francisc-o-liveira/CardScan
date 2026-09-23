import type { ApiResponse, CollectionEntry, CollectionSummary, PaginatedResponse } from "@cardscan/types";
import {
  addCollectionItemSchema,
  collectionQuerySchema,
  ownedQuerySchema,
  updateCollectionItemSchema,
} from "@cardscan/validation";
import { asyncHandler } from "../utils/asyncHandler";
import * as collectionService from "../services/collectionService";

export const listCollection = asyncHandler(async (req, res) => {
  const params = collectionQuerySchema.parse(req.query);
  const { data, total } = await collectionService.listCollection(req.user!.sub, params);
  const response: ApiResponse<PaginatedResponse<CollectionEntry>> = {
    success: true,
    data: {
      data,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      },
    },
  };
  res.status(200).json(response);
});

export const getSummary = asyncHandler(async (req, res) => {
  const summary = await collectionService.getSummary(req.user!.sub);
  const response: ApiResponse<CollectionSummary> = { success: true, data: summary };
  res.status(200).json(response);
});

/** `{ [cardId]: quantity }` for the requested cards that the user owns. */
export const getOwned = asyncHandler(async (req, res) => {
  const { cardIds } = ownedQuerySchema.parse(req.query);
  const response: ApiResponse<Record<string, number>> = {
    success: true,
    data: await collectionService.getOwnedQuantities(req.user!.sub, cardIds),
  };
  res.status(200).json(response);
});

/** The user's copies of one card; `data` is null when they own none. */
export const getCardEntry = asyncHandler(async (req, res) => {
  const entry = await collectionService.getCardEntry(req.user!.sub, req.params.cardId as string);
  const response: ApiResponse<CollectionEntry | null> = { success: true, data: entry };
  res.status(200).json(response);
});

export const addItem = asyncHandler(async (req, res) => {
  const input = addCollectionItemSchema.parse(req.body);
  const entry = await collectionService.addItem(req.user!.sub, input);
  const response: ApiResponse<CollectionEntry> = { success: true, data: entry };
  res.status(201).json(response);
});

export const updateItem = asyncHandler(async (req, res) => {
  const input = updateCollectionItemSchema.parse(req.body);
  const entry = await collectionService.updateItem(req.user!.sub, req.params.id as string, input);
  const response: ApiResponse<CollectionEntry | null> = { success: true, data: entry };
  res.status(200).json(response);
});

export const removeItem = asyncHandler(async (req, res) => {
  const entry = await collectionService.removeItem(req.user!.sub, req.params.id as string);
  const response: ApiResponse<CollectionEntry | null> = { success: true, data: entry };
  res.status(200).json(response);
});
