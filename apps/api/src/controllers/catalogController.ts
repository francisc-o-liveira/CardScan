import type { ApiResponse, PaginatedResponse } from "@cardscan/types";
import { cardQuerySchema, setQuerySchema } from "@cardscan/validation";
import { asyncHandler } from "../utils/asyncHandler";
import * as catalogService from "../services/catalogService";

export const listTcgs = asyncHandler(async (_req, res) => {
  const tcgs = await catalogService.listTcgs();
  const response: ApiResponse<typeof tcgs> = { success: true, data: tcgs };
  res.status(200).json(response);
});

export const listSets = asyncHandler(async (req, res) => {
  const { tcg } = setQuerySchema.parse(req.query);
  const sets = await catalogService.listSets(tcg);
  const response: ApiResponse<typeof sets> = { success: true, data: sets };
  res.status(200).json(response);
});

export const getSet = asyncHandler(async (req, res) => {
  const set = await catalogService.getSetWithCards(req.params.id as string);
  const response: ApiResponse<typeof set> = { success: true, data: set };
  res.status(200).json(response);
});

export const listCards = asyncHandler(async (req, res) => {
  const params = cardQuerySchema.parse(req.query);
  const { data, total } = await catalogService.listCards(params);
  const response: ApiResponse<PaginatedResponse<(typeof data)[number]>> = {
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

export const getCard = asyncHandler(async (req, res) => {
  const card = await catalogService.getCardById(req.params.id as string);
  const response: ApiResponse<typeof card> = { success: true, data: card };
  res.status(200).json(response);
});
