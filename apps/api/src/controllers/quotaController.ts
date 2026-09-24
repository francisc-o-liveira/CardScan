import type { ApiResponse, ScanQuota } from "@cardscan/types";
import { asyncHandler } from "../utils/asyncHandler";
import * as quotaService from "../services/quotaService";

export const getQuota = asyncHandler(async (req, res) => {
  const response: ApiResponse<ScanQuota> = { success: true, data: await quotaService.getQuota(req.user!.sub) };
  res.status(200).json(response);
});
