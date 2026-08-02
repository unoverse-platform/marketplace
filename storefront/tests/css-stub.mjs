/**
 * Node cannot import a stylesheet, and the components do (React Flow ships its own).
 * Vite handles that in a build; under the test runner the import is resolved to nothing,
 * which is correct: these tests assert what a page renders, never how it looks.
 */
import { register } from "node:module";
register("./css-loader.mjs", import.meta.url);
