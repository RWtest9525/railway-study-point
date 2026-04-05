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
    
    // Extract text from PDF (placeholder for actual implementation)
    if (onExtractedText) {
      extractTextFromPDF(file);
    }
  };

  const extractTextFromPDF = async (file: File) => {
    setUploading(true);
    try {
      // This is a placeholder - in a real implementation, you would:
      // 1. Send the PDF to a backend service that can extract text
      // 2. Use a library like pdf.js or pdf-parse on the frontend
      // 3. Return the extracted text
      
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock extracted text
      const mockText = `Sample Questions from ${file.name}:
      
1. What is the full form of ALP in Indian Railways?
A) Assistant Loco Pilot
B) Assistant Line Pilot  
C) Assistant Loco Personnel
D) Automated Loco Pilot
Correct Answer: A

2. Which of the following is used for braking in a diesel locomotive?
A) Vacuum brakes
B) Air brakes
C) Hydraulic brakes
D) None of these
Correct Answer: B

3. In which year was the first railway line in India opened?
A) 1853
B) 1857
C) 1901
D) 1947
Correct Answer: A`;
      
      onExtractedText(mockText);
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      alert('Failed to extract text from PDF. You can manually add questions.');
    } finally {
      setUploading(false);
    }
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
