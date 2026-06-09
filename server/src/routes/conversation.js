import { Router } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { PROJECTS_DIR } from '../services/projectScanner.js';
import { parseSessionConversation } from '../services/jsonlParser.js';

const router = Router();

router.get('/:projectDir/:fileKey', async (req, res, next) => {
  try {
    const { projectDir, fileKey } = req.params;
    const fileName = fileKey.endsWith('.jsonl') ? fileKey : `${fileKey}.jsonl`;
    const filePath = path.join(PROJECTS_DIR, projectDir, fileName);

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'Session not found' });
    }

    const conversation = await parseSessionConversation(filePath);
    res.json(conversation);
  } catch (err) {
    next(err);
  }
});

export default router;
