import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/AppError";
import * as adRewardService from "../services/adRewardService";
import * as webAdService from "../services/webAdService";
import { webAdCompleteSchema } from "@cardscan/validation";

/** AdMob's server-side verification callback for a finished rewarded ad. Always 200 once the signature is valid. */
export const rewardedAdCallback = asyncHandler(async (req, res) => {
  const rawQuery = req.originalUrl.split("?")[1] ?? "";
  const keys = await adRewardService.fetchVerifierKeys();
  if (!adRewardService.verifySsvSignature(rawQuery, keys)) throw Errors.unauthorized("Invalid signature");
  const result = await adRewardService.grantForRewardedAd(new URLSearchParams(rawQuery));
  res.status(200).json({ success: true, data: { result } });
});

/** Web: the user starts watching an ad. */
export const startWebAd = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: await webAdService.startWebAd(req.user!.sub) });
});

/** Web: the ad ended; the scans are added if the session ran long enough. */
export const completeWebAd = asyncHandler(async (req, res) => {
  const { sessionId } = webAdCompleteSchema.parse(req.body);
  const credits = await webAdService.completeWebAd(req.user!.sub, sessionId);
  res.status(200).json({ success: true, data: { credits } });
});
