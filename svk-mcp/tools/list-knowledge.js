// svk_list_knowledge — catalog of available SVK knowledge bases.

import { listKnowledgeBase } from "../lib/knowledge.js";

export async function handleListKnowledge(params) {
  return listKnowledgeBase(params.skill);
}
