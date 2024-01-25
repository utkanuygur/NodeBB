"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require('path');
const nconf = require('nconf');
const db = require('../database');
const image = require('../image');
const file = require('../file');
function Groups() {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/bmp'];
    const updateCoverPosition = function (groupName, position) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!groupName) {
                throw new Error('[[error:invalid-data]]');
            }
            yield setGroupField(groupName, 'cover:position', position);
        });
    };
    const updateCover = function (uid, data) {
        return __awaiter(this, void 0, void 0, function* () {
            let tempPath = data.file ? data.file.path : '';
            try {
                // Position only? That's fine
                if (!data.imageData && !data.file && data.position) {
                    yield updateCoverPosition(data.groupName, data.position);
                    return;
                }
                const type = data.file ? data.file.type : image.mimeFromBase64(data.imageData);
                if (!type || !allowedTypes.includes(type)) {
                    throw new Error('[[error:invalid-image]]');
                }
                if (!tempPath) {
                    tempPath = yield image.writeImageDataToTempFile(data.imageData);
                }
                const filename = `groupCover-${data.groupName}${path.extname(tempPath)}`;
                const uploadData = yield image.uploadImage(filename, 'files', {
                    path: tempPath,
                    uid: uid,
                    name: 'groupCover',
                });
                const { url } = uploadData;
                yield setGroupField(data.groupName, 'cover:url', url);
                yield image.resizeImage({
                    path: tempPath,
                    width: 358,
                });
                const thumbUploadData = yield image.uploadImage(`groupCoverThumb-${data.groupName}${path.extname(tempPath)}`, 'files', {
                    path: tempPath,
                    uid: uid,
                    name: 'groupCover',
                });
                yield setGroupField(data.groupName, 'cover:thumb:url', thumbUploadData.url);
                if (data.position) {
                    yield updateCoverPosition(data.groupName, data.position);
                }
                return { url };
            }
            finally {
                file.delete(tempPath);
            }
        });
    };
    const removeCover = function (data) {
        return __awaiter(this, void 0, void 0, function* () {
            const fields = ['cover:url', 'cover:thumb:url'];
            const values = yield getGroupFields(data.groupName, fields);
            yield Promise.all(fields.map((field) => {
                if (!values[field] || !values[field].startsWith(`${nconf.get('relative_path')}/assets/uploads/files/`)) {
                    return;
                }
                const filename = values[field].split('/').pop();
                const filePath = path.join(nconf.get('upload_path'), 'files', filename);
                return file.delete(filePath);
            }));
            yield db.deleteObjectFields(`group:${data.groupName}`, ['cover:url', 'cover:thumb:url', 'cover:position']);
        });
    };
    const setGroupField = function (groupName, field, value) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implement your logic here
        });
    };
    const getGroupFields = function (groupName, fields) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implement your logic here
        });
    };
    return {
        updateCoverPosition,
        updateCover,
        removeCover,
    };
}
exports.default = Groups;
