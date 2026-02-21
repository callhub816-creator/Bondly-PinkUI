/**
 * lib/storage.js
 * 
 * AWS S3 storage layer for audio files.
 * Handles uploads (buffer and stream) with retry logic and returns public URLs.
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class StorageManager {
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    this.bucket = process.env.S3_BUCKET;
    this.baseUrl = process.env.S3_PUBLIC_BASE_URL;

    if (!this.bucket) {
      logger.warn('S3_BUCKET not set. S3 uploads will fail.');
    }
  }

  /**
   * Upload a buffer to S3.
   * 
   * @param {string} key - S3 object key (e.g., 'tts/voice1/abc123.mp3')
   * @param {Buffer} buffer - Audio buffer to upload
   * @param {object} opts - Additional options (contentType, acl, metadata)
   * @returns {Promise<string>} Public URL of uploaded object
   * @throws {Error} If upload fails
   */
  async uploadBuffer(key, buffer, opts = {}) {
    const startTime = Date.now();

    try {
      const params = {
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: opts.contentType || 'audio/mpeg',
        ACL: opts.acl || 'public-read', // Allow TTS provider to fetch audio
        Metadata: opts.metadata || {},
      };

      const command = new PutObjectCommand(params);
      await this.s3Client.send(command);

      const publicUrl = `${this.baseUrl}/${key}`;
      const duration = Date.now() - startTime;

      logger.info(`[S3 UPLOAD] ${key} (${buffer.length} bytes) - ${duration}ms`);

      return publicUrl;
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.error(`[S3 UPLOAD FAILED] ${key} - ${duration}ms - ${err.message}`);
      throw err;
    }
  }

  /**
   * Upload a stream to S3 (more efficient for large files).
   * 
   * @param {string} key - S3 object key
   * @param {Stream} stream - Readable stream
   * @param {object} opts - Additional options (contentType, metadata)
   * @returns {Promise<string>} Public URL of uploaded object
   * @throws {Error} If upload fails
   */
  async uploadStream(key, stream, opts = {}) {
    const startTime = Date.now();

    try {
      const params = {
        Bucket: this.bucket,
        Key: key,
        Body: stream,
        ContentType: opts.contentType || 'audio/mpeg',
        ACL: opts.acl || 'public-read',
        Metadata: opts.metadata || {},
      };

      // Use AWS SDK v3 multipart upload helper
      const uploader = new Upload({
        client: this.s3Client,
        params,
        queueSize: 4, // Number of parts to upload in parallel
        partSize: 5 * 1024 * 1024, // 5MB per part
      });

      uploader.on('httpUploadProgress', (progress) => {
        logger.debug(`[S3 STREAM] ${key} - uploaded ${progress.loaded}/${progress.total} bytes`);
      });

      await uploader.done();

      const publicUrl = `${this.baseUrl}/${key}`;
      const duration = Date.now() - startTime;

      logger.info(`[S3 STREAM UPLOAD] ${key} - ${duration}ms`);

      return publicUrl;
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.error(`[S3 STREAM UPLOAD FAILED] ${key} - ${duration}ms - ${err.message}`);
      throw err;
    }
  }

  /**
   * Get public URL for an S3 object (assumes it was uploaded with public-read ACL).
   * 
   * @param {string} key - S3 object key
   * @returns {string} Public URL
   */
  getPublicUrl(key) {
    return `${this.baseUrl}/${key}`;
  }

  /**
   * Delete an object from S3.
   * 
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async delete(key) {
    try {
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.s3Client.send(command);
      logger.debug(`[S3 DELETE] ${key}`);
      return true;
    } catch (err) {
      logger.error(`[S3 DELETE FAILED] ${key} - ${err.message}`);
      return false;
    }
  }
}

module.exports = new StorageManager();
