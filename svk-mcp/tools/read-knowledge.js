// svk_read_knowledge — read a specific knowledge file by skill + path.

import { readKnowledgeFile } from "../lib/knowledge.js";

export async function handleReadKnowledge(params) {
  return readKnowledgeFile(params.skill, params.path);
}
