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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const nconf_1 = __importDefault(require("nconf"));
const database_1 = __importDefault(require("../database"));
const image_1 = __importDefault(require("../image"));
const file_1 = __importDefault(require("../file"));
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
                const type = data.file ? data.file.type : image_1.default.mimeFromBase64(data.imageData);
                if (!type || !allowedTypes.includes(type)) {
                    throw new Error('[[error:invalid-image]]');
                }
                if (!tempPath) {
                    tempPath = yield image_1.default.writeImageDataToTempFile(data.imageData);
                }
                const filename = `groupCover-${data.groupName}${path_1.default.extname(tempPath)}`;
                const uploadData = yield image_1.default.uploadImage(filename, 'files', {
                    path: tempPath,
                    uid: uid,
                    name: 'groupCover',
                });
                const { url } = uploadData;
                yield setGroupField(data.groupName, 'cover:url', url);
                yield image_1.default.resizeImage({
                    path: tempPath,
                    width: 358,
                });
                const thumbUploadData = yield image_1.default.uploadImage(`groupCoverThumb-${data.groupName}${path_1.default.extname(tempPath)}`, 'files', {
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
                file_1.default.delete(tempPath);
            }
        });
    };
    const removeCover = function (data) {
        return __awaiter(this, void 0, void 0, function* () {
            const fields = ['cover:url', 'cover:thumb:url'];
            const values = yield getGroupFields(data.groupName, fields);
            yield Promise.all(fields.map((field) => {
                if (!values[field] || !values[field].startsWith(`${nconf_1.default.get('relative_path')}/assets/uploads/files/`)) {
                    return;
                }
                const filename = values[field].split('/').pop();
                const filePath = path_1.default.join(nconf_1.default.get('upload_path'), 'files', filename);
                return file_1.default.delete(filePath);
            }));
            yield database_1.default.deleteObjectFields(`group:${data.groupName}`, ['cover:url', 'cover:thumb:url', 'cover:position']);
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
