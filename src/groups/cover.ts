const path = require('path');
const nconf = require('nconf');
const db = require('../database');
const image = require('../image');
const file = require('../file');
interface GroupData {
    groupName: string;
    position?: number;
    file?: {
        path: string;
        type: string;
    };
    imageData?: string;
}

interface UploadData {
    url: string;
}

export default function Groups() {
    const allowedTypes: string[] = ['image/png', 'image/jpeg', 'image/bmp'];

    const updateCoverPosition = async function (groupName: string, position: number): Promise<void> {
        if (!groupName) {
            throw new Error('[[error:invalid-data]]');
        }
        await setGroupField(groupName, 'cover:position', position);
    };

    const updateCover = async function (uid: string, data: GroupData): Promise<UploadData> {
        let tempPath = data.file ? data.file.path : '';
        try {
            // Position only? That's fine
            if (!data.imageData && !data.file && data.position) {
              await updateCoverPosition(data.groupName, data.position);
              return;
            }
            const type = data.file ? data.file.type : image.mimeFromBase64(data.imageData);
            if (!type || !allowedTypes.includes(type)) {
              throw new Error('[[error:invalid-image]]');
            }

            if (!tempPath) {
              tempPath = await image.writeImageDataToTempFile(data.imageData);
            }

            const filename = `groupCover-${data.groupName}${path.extname(tempPath)}`;
            const uploadData = await image.uploadImage(filename, 'files', {
                path: tempPath,
                uid: uid,
                name: 'groupCover',
            });
            const { url } = uploadData;
            await setGroupField(data.groupName, 'cover:url', url);

            await image.resizeImage({
                path: tempPath,
                width: 358,
            });
            const thumbUploadData = await image.uploadImage(`groupCoverThumb-${data.groupName}${path.extname(tempPath)}`, 'files', {
                path: tempPath,
                uid: uid,
                name: 'groupCover',
            });
            await setGroupField(data.groupName, 'cover:thumb:url', thumbUploadData.url);

            if (data.position) {
                await updateCoverPosition(data.groupName, data.position);
            }

            return { url };
        } finally {
            file.delete(tempPath);
        }
    };

    const removeCover = async function (data: { groupName: string }): Promise<void> {
        const fields = ['cover:url', 'cover:thumb:url'];
        const values = await getGroupFields(data.groupName, fields);
        await Promise.all(fields.map((field) => {
            if (!values[field] || !values[field].startsWith(`${nconf.get('relative_path')}/assets/uploads/files/`)) {
                return;
            }
            const filename = values[field].split('/').pop();
            const filePath = path.join(nconf.get('upload_path'), 'files', filename);
            return file.delete(filePath);
        }));

        await db.deleteObjectFields(`group:${data.groupName}`, ['cover:url', 'cover:thumb:url', 'cover:position']);
    };

    const setGroupField = async function (groupName: string, field: string, value: any): Promise<void> {
        // Implement your logic here
    };

    const getGroupFields = async function (groupName: string, fields: string[]): Promise<any> {
        // Implement your logic here
    };

    return {
        updateCoverPosition,
        updateCover,
        removeCover,
    };
}
