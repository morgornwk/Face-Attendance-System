import { Employee } from '../types/employee';

const avatarCache = new Map<string, string | null>();
const failedImageUrls = new Set<string>();

export function markAvatarUrlFailed(url: string | null | undefined): void {
  if (url) {
    failedImageUrls.add(url);
  }
}

export function isAvatarUrlFailed(url: string | null | undefined): boolean {
  if (!url) return false;
  return failedImageUrls.has(url);
}

export function getEmployeeFacePhoto(employee?: Employee | null): string | null {
  if (!employee) return null;

  // In-memory cache lookup
  if (avatarCache.has(employee.id)) {
    const cached = avatarCache.get(employee.id);
    if (cached && !failedImageUrls.has(cached)) {
      return cached;
    }
    if (cached && failedImageUrls.has(cached)) {
      return null;
    }
  }

  // MinIO storage URL mapping
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

  // Local storage fallback
  try {
    const local = localStorage.getItem(`employee_face_${employee.id}`);
    if (local) {
      avatarCache.set(employee.id, local);
      return local;
    }
  } catch {
    // Ignore storage errors
  }

  avatarCache.set(employee.id, null);
  return null;
}

export function saveEmployeeFacePhoto(employeeId: string, photoDataUrl: string): void {
  avatarCache.set(employeeId, photoDataUrl);
  try {
    localStorage.setItem(`employee_face_${employeeId}`, photoDataUrl);
  } catch {
    // Ignore storage quota errors
  }
}
