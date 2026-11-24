import { Employee } from '../types/employee';

// High-performance in-memory cache for avatar lookups (avoids synchronous disk I/O on render)
const avatarCache = new Map<string, string | null>();
const failedImageUrls = new Set<string>();

/**
 * Marks an image URL as failed (e.g. 404, connection refused)
 * so no component in the entire app will ever attempt to fetch it again.
 */
export function markAvatarUrlFailed(url: string | null | undefined): void {
  if (url) {
    failedImageUrls.add(url);
  }
}

/**
 * Checks whether an image URL has already failed to load.
 */
export function isAvatarUrlFailed(url: string | null | undefined): boolean {
  if (!url) return false;
  return failedImageUrls.has(url);
}

/**
 * Resolves the face photo for an employee with zero disk I/O on scroll.
 */
export function getEmployeeFacePhoto(employee?: Employee | null): string | null {
  if (!employee) return null;

  // 1. Instant O(1) in-memory cache check (0ms)
  if (avatarCache.has(employee.id)) {
    const cached = avatarCache.get(employee.id);
    if (cached && !failedImageUrls.has(cached)) {
      return cached;
    }
    if (cached && failedImageUrls.has(cached)) {
      return null;
    }
  }

  // 2. Real image URL from MinIO storage (mapped to port 9002 on host)
  // Ignore dummy 'fake-uuid' URLs from test seeders to avoid network congestion
  if (
    employee.face_image_url &&
    !employee.face_image_url.includes('fake-uuid') &&
    !employee.face_image_url.includes('example.com')
  ) {
    const fixedUrl = employee.face_image_url.replace(':9000/', ':9002/');
    if (!failedImageUrls.has(fixedUrl)) {
      avatarCache.set(employee.id, fixedUrl);
      return fixedUrl;
    }
  }

  // 3. Fallback to localStorage once per session, then store in memory
  try {
    const local = localStorage.getItem(`employee_face_${employee.id}`);
    if (local) {
      avatarCache.set(employee.id, local);
      return local;
    }
  } catch {
    // Ignore localStorage errors
  }

  avatarCache.set(employee.id, null);
  return null;
}

/**
 * Saves a registered face photo to cache and localStorage.
 */
export function saveEmployeeFacePhoto(employeeId: string, photoDataUrl: string): void {
  avatarCache.set(employeeId, photoDataUrl);
  try {
    localStorage.setItem(`employee_face_${employeeId}`, photoDataUrl);
  } catch {
    // Storage quota might be exceeded for large data URLs
  }
}
