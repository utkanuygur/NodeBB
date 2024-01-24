"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const db = __importStar(require("../database"));
const image = __importStar(require("../image"));
const file = __importStar(require("../file"));
module.exports = function (Groups) {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/bmp'];
    Groups.updateCoverPosition = function (groupName, position) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!groupName) {
                throw new Error('[[error:invalid-data]]');
            }
            yield Groups.setGroupField(groupName, 'cover:position', position);
        });
    };
    Groups.updateCover = function (uid, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || !data.groupName) {
                throw new Error('[[error:invalid-data]]');
            }
            let tempPath = '';
            try {
                if (!data.imageData && !data.file && data.position) {
                    return yield Groups.updateCoverPosition(data.groupName, data.position);
                }
                const type = data.file ? data.file.type : image.mimeFromBase64(data.imageData);
                if (!type || !allowedTypes.includes(type)) {
                    throw new Error('[[error:invalid-image]]');
                }
                if (data.file) {
                    tempPath = data.file.path;
                }
                else {
                    tempPath = yield image.writeImageDataToTempFile(data.imageData);
                }
                if (!tempPath || !path_1.default.isAbsolute(tempPath)) {
                    throw new Error('[[error:invalid-path]]');
                }
                const filename = `groupCover-${data.groupName}${path_1.default.extname(tempPath)}`;
                const uploadData = yield image.uploadImage(filename, 'files', {
                    path: tempPath,
                    uid,
                    name: 'groupCover',
                });
                yield Groups.setGroupField(data.groupName, 'cover:url', uploadData.url);
                yield image.resizeImage({
                    path: tempPath,
                    width: 358,
                });
                const thumbUploadData = yield image.uploadImage(`groupCoverThumb-${data.groupName}${path_1.default.extname(tempPath)}`, 'files', {
                    path: tempPath,
                    uid,
                    name: 'groupCover',
                });
                yield Groups.setGroupField(data.groupName, 'cover:thumb:url', thumbUploadData.url);
                if (data.position) {
                    yield Groups.updateCoverPosition(data.groupName, data.position);
                }
                return { url: uploadData.url };
            }
            catch (error) {
                throw error;
            }
            finally {
                if (tempPath) {
                    yield file.delete(tempPath).catch(e => console.error('Failed to delete temp file:', e));
                }
            }
        });
    };
    Groups.removeCover = function (data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || !data.groupName) {
                throw new Error('[[error:invalid-data]]');
            }
            const fields = ['cover:url', 'cover:thumb:url'];
            const values = yield Groups.getGroupFields(data.groupName, fields);
            const deletePromises = fields.map((field) => __awaiter(this, void 0, void 0, function* () {
                const fieldValue = values[field];
                if (fieldValue && fieldValue.startsWith(`${nconf_1.default.get('relative_path')}/assets/uploads/files/`)) {
                    const filename = fieldValue.split('/').pop();
                    const filePath = path_1.default.join(nconf_1.default.get('upload_path'), 'files', filename);
                    yield file.delete(filePath).catch(e => console.error('Failed to delete file:', e));
                }
            }));
            yield Promise.all(deletePromises);
            yield db.deleteObjectFields(`group:${data.groupName}`, ['cover:url', 'cover:thumb:url', 'cover:position']);
        });
    };
};
