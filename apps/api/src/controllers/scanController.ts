import type { ApiResponse, Scan } from "@cardscan/types";
import { confirmScanSchema, createScanSchema } from "@cardscan/validation";
import { asyncHandler } from "../utils/asyncHandler";
import * as scanService from "../services/scanService";
import * as quotaService from "../services/quotaService";

export const createScan = asyncHandler(async (req, res) => {
  const { tcg } = createScanSchema.parse(req.body ?? {});
  // The scan is paid before it runs (so parallel requests cannot overspend) and given back if it fails.
  const reservation = await quotaService.reserveScan(req.user!.sub);
  let scan;
  try {
    scan = await scanService.createScan(req.user!.sub, req.file!.buffer, undefined, { tcg });
  } catch (error) {
    await quotaService.refundScan(req.user!.sub, reservation);
    throw error;
  }
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
