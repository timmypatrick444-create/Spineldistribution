export const DEFAULT_PRODUCT_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" fill="none">' +
      '<rect width="320" height="320" rx="16" fill="#F8FAFC"/>' +
      '<rect x="76" y="88" width="168" height="116" rx="12" fill="#E2E8F0" stroke="#CBD5E1" stroke-width="4"/>' +
      '<circle cx="160" cy="146" r="28" fill="#CBD5E1"/>' +
      '<circle cx="160" cy="146" r="14" fill="#94A3B8"/>' +
      '<rect x="110" y="220" width="100" height="12" rx="6" fill="#CBD5E1"/>' +
      '<text x="160" y="264" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#64748B">SPINEL HARDWARE</text>' +
    "</svg>"
  );

/**
 * Normalizes and optimizes image URLs across Cloudinary, AWS S3, and Unsplash
 * to slash image payload sizes (often 80-95% smaller) and fix mixed-content HTTP URLs.
 */
export function optimizeImageUrl(rawUrl?: string | null, width = 420): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return DEFAULT_PRODUCT_FALLBACK;
  }

  let url = rawUrl.trim();
  if (!url) return DEFAULT_PRODUCT_FALLBACK;

  // Preserve data URLs and local API proxy URLs as-is
  if (url.startsWith('data:') || url.startsWith('/api/proxy-image')) {
    return url;
  }

  // Fix mixed-content HTTP URLs on known HTTPS-capable hosts
  if (
    url.startsWith('http://avoweb1.s3-us-west-2.amazonaws.com') ||
    url.startsWith('http://res.cloudinary.com') ||
    url.startsWith('http://images.unsplash.com')
  ) {
    url = 'https://' + url.slice('http://'.length);
  }

  // Inject Cloudinary automatic format (AVIF/WebP), quality & width transforms if not already present
  if (url.includes('res.cloudinary.com/') && url.includes('/image/upload/')) {
    const marker = '/image/upload/';
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const prefix = url.slice(0, idx + marker.length);
      const rest = url.slice(idx + marker.length);
      // Check if existing transforms are missing (path starts directly with version v123/ or asset name)
      const firstSegment = rest.split('/')[0] || '';
      const hasTransforms =
        firstSegment.includes(',') ||
        /^(w_|h_|f_|q_|c_|dpr_|e_|ar_)/.test(firstSegment);
      if (!hasTransforms) {
        return `${prefix}f_auto,q_auto:good,w_${width},c_limit/${rest}`;
      }
    }
  }

  // Optimize Unsplash width and format parameters
  if (url.includes('images.unsplash.com/')) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', 'crop');
      parsed.searchParams.set('w', String(width));
      if (!parsed.searchParams.has('q')) {
        parsed.searchParams.set('q', '75');
      }
      return parsed.toString();
    } catch {
      return url;
    }
  }

  return url;
}

/**
 * Shared resilient image error handler: retries once through our cached server proxy,
 * then displays an inline SVG hardware placeholder so broken images never cause repeated 404s.
 */
export function handleProductImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  originalSrc?: string | null
): void {
  const target = e.currentTarget;
  const cleanOriginal = originalSrc ? optimizeImageUrl(originalSrc, 480) : '';

  if (
    !target.dataset.retried &&
    cleanOriginal &&
    !cleanOriginal.startsWith('data:') &&
    !cleanOriginal.startsWith('/api/proxy-image') &&
    (cleanOriginal.startsWith('http://') || cleanOriginal.startsWith('https://'))
  ) {
    target.dataset.retried = 'true';
    target.src = `/api/proxy-image?url=${encodeURIComponent(cleanOriginal)}`;
  } else if (target.src !== DEFAULT_PRODUCT_FALLBACK) {
    target.src = DEFAULT_PRODUCT_FALLBACK;
  }
}
