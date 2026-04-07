import { useState } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';

interface PDFUploaderProps {
  onFileSelect: (file: File) => void;
  onExtractedText?: (text: string) => void;
  className?: string;
}

export function PDFUploader({ onFileSelect, onExtractedText, className = '' }: PDFUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');
    
    if (pdfFile) {
      handleFileSelection(pdfFile);
    } else {
      alert('Please upload a PDF file');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleFileSelection = (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size must be less than 10MB');
      return;
    }
    
    setSelectedFile(file);
    onFileSelect(file);
    
    // Extract text from PDF
    if (onExtractedText) {
      extractTextFromPDF(file, onExtractedText);
    }
  };

  const extractTextFromPDF = async (file: File, callback: (text: string) => void) => {
    setUploading(true);
    try {
      // Try to use PDF.js from CDN
      const text = await extractWithPDFJS(file);
      if (text && text.trim().length > 50) {
        callback(text);
      } else {
        // Fallback to basic extraction
        const basicText = await basicPDFExtraction();
        callback(basicText);
      }
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      // Provide manual entry guidance
      const manualText = `PDF extraction failed. Please copy and paste your questions in this format:

1. What is your question here?
A) Option 1
B) Option 2
C) Option 3
D) Option 4
Correct Answer: A

2. Next question?
A) Option 1
B) Option 2
C) Option 3
D) Option 4
Correct Answer: B`;
      callback(manualText);
      alert('PDF extraction encountered an issue. Please manually enter questions or check the format.');
    } finally {
      setUploading(false);
    }
  };

  // Better PDF extraction using PDF.js from CDN
  const extractWithPDFJS = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Load PDF.js from CDN
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) {
          reject(new Error('PDF.js not loaded'));
          return;
        }
        
        // Set worker source
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        file.arrayBuffer().then(async (arrayBuffer) => {
          try {
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            
            // Extract text from each page (limit to first 10 pages)
            for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ')
                .trim();
              
              fullText += pageText + '\n\n';
            }
            
            // Clean and format the extracted text
            resolve(cleanExtractedText(fullText));
          } catch (error) {
            reject(error);
          }
        }).catch(reject);
      };
      script.onerror = () => reject(new Error('Failed to load PDF.js'));
      document.head.appendChild(script);
    });
  };

  // Basic fallback extraction message
  const basicPDFExtraction = async (): Promise<string> => {
    return `PDF extraction requires proper setup. 

Please manually enter your questions in this format:

1. Question text here?
A) Option A
B) Option B
C) Option C
D) Option D
Correct Answer: A

2. Another question?
A) Option A
B) Option B
C) Option C
D) Option D
Correct Answer: B

Note: The system will automatically:
- Detect question numbers (1., 2., etc.)
- Find options (A), B), C), D))
- Extract correct answers
- Ignore extra text and explanations`;
  };

  // Clean and format extracted text for better parsing
  const cleanExtractedText = (text: string): string => {
    let cleaned = text;
    
    // Remove excessive whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // Try to identify and format questions
    const lines = cleaned.split('\n');
    const formattedLines: string[] = [];
    let questionCount = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Check if this looks like a question (contains question mark or starts with number)
      if (trimmed.includes('?') || /^\d+\./.test(trimmed)) {
        questionCount++;
        formattedLines.push(`${questionCount}. ${trimmed.replace(/^\d+\.\s*/, '')}`);
      } 
      // Check if this looks like an option
      else if (/^[A-D][\).]\s/.test(trimmed)) {
        const optionLetter = trimmed[0];
        const optionText = trimmed.substring(2).trim();
        formattedLines.push(`${optionLetter}) ${optionText}`);
      }
      // Check if this contains answer information
      else if (/answer|correct|ans:\s*[A-D]/i.test(trimmed)) {
        const match = trimmed.match(/([A-D])[\).]/i);
        if (match) {
          formattedLines.push(`Correct Answer: ${match[1].toUpperCase()}`);
        }
      }
    }
    
    return formattedLines.join('\n') || cleaned;
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {selectedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 text-green-400">
              <FileText className="w-8 h-8" />
              <span className="font-medium">{selectedFile.name}</span>
              <button
                onClick={removeFile}
                className="p-1 hover:bg-red-500/10 rounded-lg transition"
              >
                <X className="w-4 h-4 text-red-400" />
              </button>
            </div>
            
            {uploading && (
              <div className="flex items-center justify-center gap-2 text-blue-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Extracting questions...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="w-12 h-12 text-gray-500 mx-auto" />
            <div>
              <p className="text-gray-300 font-medium">Upload PDF File</p>
              <p className="text-gray-500 text-sm mt-1">
                Drag and drop or click to select a PDF file (max 10MB)
              </p>
            </div>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileInput}
              className="hidden"
              id="pdf-upload"
            />
            <label
              htmlFor="pdf-upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition"
            >
              <Upload className="w-4 h-4" />
              Select PDF
            </label>
          </div>
        )}
      </div>
      
      {uploading && (
        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
            <p className="text-white text-sm">Processing PDF...</p>
          </div>
        </div>
      )}
    </div>
  );
}