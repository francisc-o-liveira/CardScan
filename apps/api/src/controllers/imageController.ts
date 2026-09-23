import { asyncHandler } from "../utils/asyncHandler";
import { ensureProxiedImage, parseProxyTarget } from "../services/imageProxyService";

/**
 * GET /api/images?url=<card image URL>
 *
 * Some networks cannot reach a card-image CDN directly, so clients ask the API for the image instead. The
 * API stores it on first use and redirects to the stored copy under /assets, which already sets long-lived
 * caching and the cross-origin header. The redirect is relative on purpose: the client keeps using the
 * same host it reached the API on, whatever API_PUBLIC_URL says.
 */
export const proxyImage = asyncHandler(async (req, res) => {
  const target = parseProxyTarget(req.query.url);
  const key = await ensureProxiedImage(target);
  res.redirect(302, `/assets/${key}`);
});
