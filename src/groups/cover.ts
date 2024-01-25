'use strict';

import * as path from 'path';
import * as nconf from 'nconf';
import * as db from '../database';
import * as image from '../image';
import * as file from '../file';
import { File as MulterFile } from 'multer';

interface GroupData {
  groupName: string;
  imageData?: string;
  file?: MulterFile;
  position?: string;
}

interface UploadData {
  url: string;
}

interface Groups {
  setGroupField(groupName: string, field: string, value: string): Promise<void>;
  getGroupFields(groupName: string, fields: string[]): Promise<Record<string, string>>;
  updateCoverPosition(groupName: string, position: string): Promise<void>;
  updateCover(uid: number, data: GroupData): Promise<{ url: string }>;
  removeCover(data: GroupData): Promise<void>;
}

export default function (Groups: Groups) {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/bmp'];

  Groups.updateCoverPosition = async function (groupName: string, position: string): Promise<void> {
    if (!groupName) {
      throw new Error('[[error:invalid-data]]');
    }
    await Groups.setGroupField(groupName, 'cover:position', position);
  };

  Groups.updateCover = async function (uid: number, data: GroupData): Promise<{ url: string }> {
    let tempPath = data.file ? data.file.path : '';
    try {
      if (!data.imageData && !data.file && data.position) {
        await Groups.updateCoverPosition(data.groupName, data.position);
        return { url: '' }; // Return a default or placeholder URL
      }

      const type = data.file ? data.file.mimetype : image.mimeFromBase64(data.imageData);
      if (!type || !allowedTypes.includes(type)) {
        throw new Error('[[error:invalid-image]]');
      }

      if (!tempPath) {
        tempPath = await image.writeImageDataToTempFile(data.imageData);
      }

      const filename = `groupCover-${data.groupName}${path.extname(tempPath)}`;
      const uploadData: UploadData = await image.uploadImage(filename, 'files', {
        path: tempPath,
        uid,
        name: 'groupCover',
      });

      await Groups.setGroupField(data.groupName, 'cover:url', uploadData.url);

      await image.resizeImage({
        path: tempPath,
        width: 358,
      });

      const thumbUploadData: UploadData = await image.uploadImage(`groupCoverThumb-${data.groupName}${path.extname(tempPath)}`, 'files', {
        path: tempPath,
        uid,
        name: 'groupCover',
      });

      await Groups.setGroupField(data.groupName, 'cover:thumb:url', thumbUploadData.url);

      if (data.position) {
        await Groups.updateCoverPosition(data.groupName, data.position);
      }

      return { url: uploadData.url };
    } finally {
      if (tempPath) {
        file.delete(tempPath);
      }
    }
  };

  Groups.removeCover = async function (data: GroupData): Promise<void> {
    const fields = ['cover:url', 'cover:thumb:url'];
    const values = await Groups.getGroupFields(data.groupName, fields);

    await Promise.all(fields.map(async (field) => {
      if (values[field] && values[field].startsWith(`${nconf.get('relative_path')}/assets/uploads/files/`)) {
        const filename = values[field].split('/').pop() || '';
        const filePath = path.join(nconf.get('upload_path'), 'files', filename);
        await file.delete(filePath);
      }
    }));

    await db.deleteObjectFields(`group:${data.groupName}`, ['cover:url', 'cover:thumb:url', 'cover:position']);
  };
}
