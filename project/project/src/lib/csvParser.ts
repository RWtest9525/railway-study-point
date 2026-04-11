/**
 * CSV/Excel Parser for bulk question import
 * Supports CSV files with question data
 */

export interface ParsedQuestion {
  subject: string;
  topic?: string;
  subtopic?: string;
  question_text: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_answer: number;
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  marks?: number;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  errors: ParseError[];
  summary: ParseSummary;
}

export interface ParseError {
  row: number;
  field: string;
  message: string;
}

export interface ParseSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateCount: number;
}

/**
 * Parse CSV text into structured question data
 */
export function parseCSV(text: string): ParseResult {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  const headers = parseCSVLine(lines[0]);
  const result: ParseResult = {
    questions: [],
    errors: [],
    summary: {
      totalRows: lines.length - 1,
      validRows: 0,
      errorRows: 0,
      duplicateCount: 0,
    },
  };

  // Validate headers
  const requiredHeaders = ['question_text', 'option1', 'option2', 'option3', 'option4', 'correct_answer'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    result.errors.push({
      row: 0,
      field: 'headers',
      message: `Missing required headers: ${missingHeaders.join(', ')}`,
    });
    return result;
  }

  // Track duplicates
  const seenQuestions = new Set<string>();

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) {
      result.errors.push({
        row: i + 1,
        field: 'row',
        message: `Expected ${headers.length} columns, got ${values.length}`,
      });
      result.summary.errorRows++;
      continue;
    }

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    // Validate row
    const rowErrors = validateQuestionRow(row, i + 1);
    if (rowErrors.length > 0) {
      result.errors.push(...rowErrors);
      result.summary.errorRows++;
      continue;
    }

    // Check for duplicates
    const questionKey = row.question_text.trim().toLowerCase();
    if (seenQuestions.has(questionKey)) {
      result.summary.duplicateCount++;
      result.errors.push({
        row: i + 1,
        field: 'question_text',
        message: 'Duplicate question detected',
      });
      continue;
    }
    seenQuestions.add(questionKey);

    // Parse the question
    const question: ParsedQuestion = {
      subject: row.subject || 'Maths',
      topic: row.topic,
      subtopic: row.subtopic,
      question_text: row.question_text.trim(),
      option1: row.option1.trim(),
      option2: row.option2.trim(),
      option3: row.option3.trim(),
      option4: row.option4.trim(),
      correct_answer: parseInt(row.correct_answer) - 1, // Convert 1-4 to 0-3
      explanation: row.explanation?.trim(),
      difficulty: parseDifficulty(row.difficulty),
      tags: row.tags ? row.tags.split(',').map(t => t.trim()) : [],
      marks: row.marks ? parseInt(row.marks) : 1,
    };

    result.questions.push(question);
    result.summary.validRows++;
  }

  return result;
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i++; // Skip next quote
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Validate a question row
 */
function validateQuestionRow(row: Record<string, string>, rowNum: number): ParseError[] {
  const errors: ParseError[] = [];

  // Check required fields
  if (!row.question_text?.trim()) {
    errors.push({ row: rowNum, field: 'question_text', message: 'Question text is required' });
  }

  // Check options
  const options = ['option1', 'option2', 'option3', 'option4'];
  options.forEach(opt => {
    if (!row[opt]?.trim()) {
      errors.push({ row: rowNum, field: opt, message: `${opt} is required` });
    }
  });

  // Check correct_answer
  const correctAnswer = parseInt(row.correct_answer);
  if (isNaN(correctAnswer) || correctAnswer < 1 || correctAnswer > 4) {
    errors.push({
      row: rowNum,
      field: 'correct_answer',
      message: 'correct_answer must be 1, 2, 3, or 4',
    });
  }

  // Check subject
  const validSubjects = ['Maths', 'Reasoning', 'GK', 'Science'];
  if (row.subject && !validSubjects.includes(row.subject)) {
    errors.push({
      row: rowNum,
      field: 'subject',
      message: `Subject must be one of: ${validSubjects.join(', ')}`,
    });
  }

  // Check difficulty
  const validDifficulties = ['easy', 'medium', 'hard'];
  if (row.difficulty && !validDifficulties.includes(row.difficulty.toLowerCase())) {
    errors.push({
      row: rowNum,
      field: 'difficulty',
      message: `Difficulty must be one of: ${validDifficulties.join(', ')}`,
    });
  }

  // Check marks
  if (row.marks && (isNaN(parseInt(row.marks)) || parseInt(row.marks) < 0)) {
    errors.push({
      row: rowNum,
      field: 'marks',
      message: 'Marks must be a positive number',
    });
  }

  return errors;
}

/**
 * Parse difficulty string to enum
 */
function parseDifficulty(value: string): 'easy' | 'medium' | 'hard' | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (lower === 'easy') return 'easy';
  if (lower === 'medium') return 'medium';
  if (lower === 'hard') return 'hard';
  return undefined;
}

/**
 * Convert ParsedQuestion to Firestore format
 */
export function toFirestoreQuestion(
  question: ParsedQuestion,
  examId: string
): Record<string, any> {
  return {
    exam_id: examId,
    subject: question.subject,
    topic: question.topic,
    subtopic: question.subtopic,
    question_text: question.question_text,
    options: [question.option1, question.option2, question.option3, question.option4],
    correct_index: question.correct_answer,
    explanation: question.explanation,
    difficulty: question.difficulty,
    tags: question.tags,
    marks: question.marks || 1,
    created_at: new Date().toISOString(),
  };
}

/**
 * Generate CSV template for bulk import
 */
export function generateCSVTemplate(): string {
  const headers = [
    'subject',
    'topic',
    'subtopic',
    'question_text',
    'option1',
    'option2',
    'option3',
    'option4',
    'correct_answer',
    'explanation',
    'difficulty',
    'tags',
    'marks',
  ];

  const sampleRow = [
    'Maths',
    'Algebra',
    'Linear Equations',
    'Solve for x: 2x + 5 = 15',
    'x = 5',
    'x = 10',
    'x = 3',
    'x = 7',
    '1',
    'Subtract 5 from both sides, then divide by 2',
    'easy',
    'algebra,equations',
    '1',
  ];

  return [
    headers.join(','),
    sampleRow.map(val => `"${val}"`).join(','),
  ].join('\n');
}

/**
 * Download CSV template file
 */
export function downloadCSVTemplate() {
  const csv = generateCSVTemplate();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'question_import_template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

/**
 * Validate file type for import
 */
export function isValidImportFile(file: File): boolean {
  const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
  const validExtensions = ['.csv', '.xlsx', '.xls'];
  
  const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  
  return validTypes.includes(file.type) || validExtensions.includes(extension);
}