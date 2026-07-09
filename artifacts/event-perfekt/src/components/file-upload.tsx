import { useState, useRef } from "react";
import { Upload, X, File } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  accept?: string;
  placeholder?: string;
  currentFile?: string;
}

export default function FileUpload({ 
  onFileSelect, 
  accept = "image/*", 
  placeholder = "Click to upload or drag and drop",
  currentFile 
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const clearFile = () => {
    handleFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isImage = accept.includes('image');
  const displayFile = selectedFile || (currentFile ? { name: currentFile.split('/').pop() } : null);

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />
      
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragOver ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}
          ${displayFile ? 'bg-gray-50' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {displayFile ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isImage && selectedFile ? (
                <img 
                  src={URL.createObjectURL(selectedFile)} 
                  alt="Preview" 
                  className="w-12 h-12 object-cover rounded"
                />
              ) : (
                <File className="w-8 h-8 text-gray-400" />
              )}
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">
                  {typeof displayFile === 'object' ? displayFile.name : displayFile}
                </p>
                {selectedFile && (
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="w-8 h-8 text-gray-400 mx-auto" />
            <div>
              <p className="text-sm font-medium text-gray-900">{placeholder}</p>
              <p className="text-xs text-gray-500">
                {isImage ? 'PNG, JPG, GIF up to 10MB' : 'PDF, DOC, DOCX up to 10MB'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
