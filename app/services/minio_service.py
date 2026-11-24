"""Service จัดการอัปโหลดและจัดเก็บรูปภาพใบหน้าบน MinIO Object Storage"""

from __future__ import annotations

import asyncio
import io
import json
from pathlib import Path
import structlog
from minio import Minio
from minio.error import S3Error

from app.core.config import settings

logger = structlog.get_logger(__name__)


class MinioService:
    """Handles object storage uploads to MinIO for registered and detected face images."""

    def __init__(self) -> None:
        self.bucket_name = settings.minio_bucket_name
        self.client = Minio(
            endpoint=settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )

    _MIME_TYPES = {
        ".png": "image/png",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
    }

    def ensure_bucket_exists(self) -> None:
        """Checks if the images bucket exists. If not, creates it and sets a public read-only policy."""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                logger.info("minio_bucket_not_found", bucket=self.bucket_name)
                self.client.make_bucket(self.bucket_name)
                logger.info("minio_bucket_created", bucket=self.bucket_name)

                # bucket policy ให้ทุกคนอ่านได้ (public read-only) เพื่อให้ URL ที่แชร์ไปสามารถเข้าถึงรูปได้ทันที
                policy = {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal": {"AWS": ["*"]},
                            "Action": ["s3:GetObject"],
                            "Resource": [f"arn:aws:s3:::{self.bucket_name}/*"],
                        }
                    ],
                }
                self.client.set_bucket_policy(self.bucket_name, json.dumps(policy))
                logger.info("minio_bucket_policy_configured", bucket=self.bucket_name)
            else:
                logger.debug("minio_bucket_exists", bucket=self.bucket_name)
        except S3Error:
            logger.exception("minio_bucket_initialization_failed", bucket=self.bucket_name)
            raise

    def upload_image(self, image_bytes: bytes, filename: str) -> str:
        """
        Uploads an image byte array to MinIO.
        Returns the external HTTP URL.
        """
        ext = Path(filename).suffix.lower()
        content_type = self._MIME_TYPES.get(ext, "image/jpeg")

        try:
            self.client.put_object(
                bucket_name=self.bucket_name,
                object_name=filename,
                data=io.BytesIO(image_bytes),
                length=len(image_bytes),
                content_type=content_type,
            )
            # Construct external URL
            external_url = f"{settings.minio_external_endpoint.rstrip('/')}/{self.bucket_name}/{filename}"
            logger.info("minio_image_uploaded", filename=filename, url=external_url)
            return external_url
        except S3Error:
            logger.exception("minio_image_upload_failed", filename=filename)
            raise

    async def upload_image_async(self, image_bytes: bytes, filename: str) -> str:
        """อัปโหลดรูปภาพขึ้น MinIO แบบ Non-blocking (รันใน thread pool)"""
        return await asyncio.to_thread(self.upload_image, image_bytes, filename)


# Global singleton instance
minio_service = MinioService()
