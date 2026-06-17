import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const OBJ_DIR = path.join(os.homedir(), '.career');
const OBJ_FILE = path.join(OBJ_DIR, 'objectives.json');
const REPORT_DIR = path.join(OBJ_DIR, 'objective-reports');

fs.mkdirSync(OBJ_DIR, { recursive: true });
fs.mkdirSync(REPORT_DIR, { recursive: true });

function readObjectives() {
  try {
    return JSON.parse(fs.readFileSync(OBJ_FILE, 'utf-8'));
  } catch {
    return { objectives: [] };
  }
}

function writeObjectives(data) {
  fs.writeFileSync(OBJ_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function getObjectives() {
  return readObjectives().objectives;
}

export function saveObjective(obj) {
  const data = readObjectives();
  if (obj.id) {
    const idx = data.objectives.findIndex((o) => o.id === obj.id);
    if (idx >= 0) {
      data.objectives[idx] = { ...data.objectives[idx], ...obj };
    } else {
      data.objectives.push(obj);
    }
  } else {
    obj.id = crypto.randomUUID();
    obj.order = data.objectives.length + 1;
    data.objectives.push(obj);
  }
  writeObjectives(data);
  return obj;
}

export function deleteObjective(id) {
  const data = readObjectives();
  data.objectives = data.objectives.filter((o) => o.id !== id);
  writeObjectives(data);
}

export function getObjectiveReport(period) {
  const filePath = path.join(REPORT_DIR, `${period}.json`);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

export function saveObjectiveReport(period, report) {
  const filePath = path.join(REPORT_DIR, `${period}.json`);
  const data = { period, ...report, savedAt: new Date().toISOString() };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}
