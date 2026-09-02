import { createSchemaServices } from './services.js';
import { serializeDocument as serializeWithSchema } from './serialize.js';

const core = createSchemaServices();
export const coreSchemaServices = core;

// Kept for existing internal imports. Editor instances use their own services.
export const schema = core.schema;
export const parseDocument = core.parseDocument;
export const parseSlice = core.parseSlice;
export const normalizeForParse = core.normalizeForParse;
export const serializeDocument = (value, targetSchema = schema) => (
    targetSchema === schema ? core.serializeDocument(value) : serializeWithSchema(value, targetSchema)
);
export { createSchemaServices };
