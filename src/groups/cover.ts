import path from 'path';
import nconf from 'nconf';
import * as db from '../database';
import * as image from '../image';
import * as file from '../file';

module.exports = function (Groups) {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/bmp'];

    Groups.updateCoverPosition = async function (groupName, position) {
        if (!groupName) {
            throw new Error('[[error:invalid-data]]');
        }
        await Groups.setGroupField(groupName, 'cover:position', position);
    };

    Groups.updateCover = async function (uid, data) {
        if (!data || !data.groupName) {
            throw new Error('[[error:invalid-data]]');
        }

        let tempPath = '';
        try {
            if (!data.imageData && !data.file && data.position) {
                return await Groups.updateCoverPosition(data.groupName, data.position);
            }

            const type = data.file ? data.file.type : image.mimeFromBase64(data.imageData);
            if (!type || !allowedTypes.includes(type)) {
                throw new Error('[[error:invalid-image]]');
            }

            if (data.file) {
                tempPath = data.file.path;
            } else {
                tempPath = await image.writeImageDataToTempFile(data.imageData);
            }

            if (!tempPath || !path.isAbsolute(tempPath)) {
                throw new Error('[[error:invalid-path]]');
            }

            const filename = `groupCover-${data.groupName}${path.extname(tempPath)}`;
            const uploadData = await image.uploadImage(filename, 'files', {
                path: tempPath,
                uid,
                name: 'groupCover',
            });

            await Groups.setGroupField(data.groupName, 'cover:url', uploadData.url);

            await image.resizeImage({
                path: tempPath,
                width: 358,
            });

            const thumbUploadData = await image.uploadImage(`groupCoverThumb-${data.groupName}${path.extname(tempPath)}`, 'files', {
                path: tempPath,
                uid,
                name: 'groupCover',
            });

            await Groups.setGroupField(data.groupName, 'cover:thumb:url', thumbUploadData.url);

            if (data.position) {
                await Groups.updateCoverPosition(data.groupName, data.position);
            }

            return { url: uploadData.url };
        } catch (error) {
            throw error;
        } finally {
            if (tempPath) {
                await file.delete(tempPath).catch(e => console.error('Failed to delete temp file:', e));
            }
        }
    };

    Groups.removeCover = async function (data) {
        if (!data || !data.groupName) {
            throw new Error('[[error:invalid-data]]');
        }

        const fields = ['cover:url', 'cover:thumb:url'];
        const values = await Groups.getGroupFields(data.groupName, fields);

        const deletePromises = fields.map(async (field) => {
            const fieldValue = values[field];
            if (fieldValue && fieldValue.startsWith(`${nconf.get('relative_path')}/assets/uploads/files/`)) {
                const filename = fieldValue.split('/').pop();
                const filePath = path.join(nconf.get('upload_path'), 'files', filename);
                await file.delete(filePath).catch(e => console.error('Failed to delete file:', e));
            }
        });
        await Promise.all(deletePromises);

        await db.deleteObjectFields(`group:${data.groupName}`, ['cover:url', 'cover:thumb:url', 'cover:position']);
    };
};
