import type { ApiResponse, Scan } from "@cardscan/types";
import { confirmScanSchema } from "@cardscan/validation";
import { asyncHandler } from "../utils/asyncHandler";
import * as scanService from "../services/scanService";

export const createScan = asyncHandler(async (req, res) => {
  const scan = await scanService.createScan(req.user!.sub, req.file!.buffer);
  const response: ApiResponse<Scan> = { success: true, data: scan };
  res.status(201).json(response);
});

export const listScans = asyncHandler(async (req, res) => {
  const scans = await scanService.listScans(req.user!.sub);
  const response: ApiResponse<Scan[]> = { success: true, data: scans };
  res.status(200).json(response);
});

export const getScan = asyncHandler(async (req, res) => {
  const scan = await scanService.getScan(req.user!.sub, req.params.id as string);
  const response: ApiResponse<Scan> = { success: true, data: scan };
  res.status(200).json(response);
});

export const confirmScan = asyncHandler(async (req, res) => {
  const { cardId } = confirmScanSchema.parse(req.body);
  const scan = await scanService.confirmScan(req.user!.sub, req.params.id as string, cardId);
  const response: ApiResponse<Scan> = { success: true, data: scan };
  res.status(200).json(response);
});
