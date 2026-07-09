import { useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import * as XLSX from 'xlsx';

interface ExcelRow {
  [key: string]: any;
}

interface ColumnMapping {
  excelColumn: string;
  systemField: string;
  required: boolean;
}

interface ExcelImporterProps {
  onImport: (data: any[]) => void;
  onCancel: () => void;
}

const systemFields = [
  { key: 'category', label: 'Category', required: true },
  { key: 'subcategory', label: 'Subcategory', required: false },
  { key: 'description', label: 'Description', required: true },
  { key: 'estimatedCost', label: 'Estimated Cost', required: true },
  { key: 'actualCost', label: 'Actual Cost', required: false },
  { key: 'paidAmount', label: 'Paid Amount', required: false },
  { key: 'vendor', label: 'Vendor', required: false },
  { key: 'dueDate', label: 'Due Date', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'priority', label: 'Priority', required: false },
  { key: 'notes', label: 'Notes', required: false }
];

export function ExcelImporter({ onImport, onCancel }: ExcelImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping[]>([]);
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const [previewData, setPreviewData] = useState<any[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 0) {
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1).map(row => {
            const obj: ExcelRow = {};
            headers.forEach((header, index) => {
              obj[header] = (row as any[])[index] || '';
            });
            return obj;
          });
          
          setExcelColumns(headers);
          setExcelData(rows.filter(row => Object.values(row).some(val => val !== '')));
          
          // Auto-map common column names
          const autoMapping = systemFields.map(field => {
            const matchingColumn = headers.find(header => 
              header.toLowerCase().includes(field.key.toLowerCase()) ||
              header.toLowerCase().includes(field.label.toLowerCase()) ||
              (field.key === 'estimatedCost' && (header.toLowerCase().includes('estimate') || header.toLowerCase().includes('budget'))) ||
              (field.key === 'actualCost' && header.toLowerCase().includes('actual')) ||
              (field.key === 'paidAmount' && header.toLowerCase().includes('paid'))
            );
            
            return {
              excelColumn: matchingColumn || '',
              systemField: field.key,
              required: field.required
            };
          });
          
          setColumnMapping(autoMapping);
          setStep('map');
        }
      } catch (error) {
        console.error('Error reading Excel file:', error);
        alert('Error reading Excel file. Please make sure it\'s a valid Excel file.');
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  const updateMapping = (systemField: string, excelColumn: string) => {
    setColumnMapping(prev => 
      prev.map(mapping => 
        mapping.systemField === systemField 
          ? { ...mapping, excelColumn }
          : mapping
      )
    );
  };

  const generatePreview = () => {
    const mapped = excelData.slice(0, 5).map(row => {
      const mappedRow: any = { id: `preview-${Math.random()}` };
      
      columnMapping.forEach(mapping => {
        if (mapping.excelColumn && row[mapping.excelColumn]) {
          let value = row[mapping.excelColumn];
          
          // Convert data types
          if (mapping.systemField.includes('Cost') || mapping.systemField.includes('Amount')) {
            value = parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;
          } else if (mapping.systemField === 'dueDate' && value) {
            value = new Date(value);
          } else if (mapping.systemField === 'status') {
            value = String(value).toLowerCase();
            if (!['pending', 'approved', 'paid', 'overdue'].includes(value)) {
              value = 'pending';
            }
          } else if (mapping.systemField === 'priority') {
            value = String(value).toLowerCase();
            if (!['low', 'medium', 'high', 'critical'].includes(value)) {
              value = 'medium';
            }
          }
          
          mappedRow[mapping.systemField] = value;
        } else if (mapping.required) {
          mappedRow[mapping.systemField] = mapping.systemField === 'category' ? 'Miscellaneous' :
                                          mapping.systemField === 'description' ? 'Imported Item' :
                                          mapping.systemField === 'estimatedCost' ? 0 : '';
        }
      });
      
      return mappedRow;
    });
    
    setPreviewData(mapped);
    setStep('preview');
  };

  const finalizeImport = () => {
    const allMapped = excelData.map((row, index) => {
      const mappedRow: any = { 
        id: `import-${Date.now()}-${index}`,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30 days from now
      };
      
      columnMapping.forEach(mapping => {
        if (mapping.excelColumn && row[mapping.excelColumn]) {
          let value = row[mapping.excelColumn];
          
          // Convert data types
          if (mapping.systemField.includes('Cost') || mapping.systemField.includes('Amount')) {
            value = parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;
          } else if (mapping.systemField === 'dueDate' && value) {
            try {
              value = new Date(value);
            } catch {
              value = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            }
          } else if (mapping.systemField === 'status') {
            value = String(value).toLowerCase();
            if (!['pending', 'approved', 'paid', 'overdue'].includes(value)) {
              value = 'pending';
            }
          } else if (mapping.systemField === 'priority') {
            value = String(value).toLowerCase();
            if (!['low', 'medium', 'high', 'critical'].includes(value)) {
              value = 'medium';
            }
          }
          
          mappedRow[mapping.systemField] = value;
        } else if (mapping.required) {
          mappedRow[mapping.systemField] = mapping.systemField === 'category' ? 'Miscellaneous' :
                                          mapping.systemField === 'description' ? `Imported Item ${index + 1}` :
                                          mapping.systemField === 'estimatedCost' ? 0 : '';
        }
      });
      
      // Set defaults for missing fields
      if (!mappedRow.status) mappedRow.status = 'pending';
      if (!mappedRow.priority) mappedRow.priority = 'medium';
      if (!mappedRow.actualCost) mappedRow.actualCost = 0;
      if (!mappedRow.paidAmount) mappedRow.paidAmount = 0;
      if (!mappedRow.vendor) mappedRow.vendor = '';
      if (!mappedRow.notes) mappedRow.notes = `Imported from ${file?.name}`;
      
      return mappedRow;
    });
    
    onImport(allMapped);
  };

  const requiredMappings = columnMapping.filter(m => m.required);
  const missingRequired = requiredMappings.filter(m => !m.excelColumn);
  const canProceed = missingRequired.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileSpreadsheet className="w-5 h-5" />
          <span>Import Excel Budget</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="text-center border-2 border-dashed border-gray-300 rounded-lg p-8">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-upload"
              />
              <label htmlFor="excel-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-white mx-auto mb-4" />
                <p className="text-lg font-medium text-white mb-2" style={{color: 'white !important'}}>
                  Upload Excel Budget File
                </p>
                <p className="text-sm text-white" style={{color: 'white !important'}}>
                  Supports .xlsx, .xls, and .csv files
                </p>
              </label>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Supported Excel Formats:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Any column order - the system will auto-detect common names</li>
                <li>• Flexible naming: "Cost", "Price", "Amount", "Budget", etc.</li>
                <li>• Status values: "Pending", "Approved", "Paid", "Complete", etc.</li>
                <li>• Priority levels: "Low", "Medium", "High", "Critical", "Urgent", etc.</li>
                <li>• Handles up to 1000+ budget entries</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Map Excel Columns to System Fields</h4>
              <Badge variant="outline">
                {excelData.length} rows found
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {systemFields.map(field => {
                const mapping = columnMapping.find(m => m.systemField === field.key);
                const isMapped = mapping?.excelColumn;
                
                return (
                  <div key={field.key} className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <span>{field.label}</span>
                      {field.required && <span className="text-red-500">*</span>}
                      {isMapped && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </Label>
                    <Select
                      value={mapping?.excelColumn || ''}
                      onValueChange={(value) => updateMapping(field.key, value)}
                    >
                      <SelectTrigger className={!isMapped && field.required ? 'border-red-300' : ''}>
                        <SelectValue placeholder="Select Excel column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Skip this field --</SelectItem>
                        {excelColumns.map(column => (
                          <SelectItem key={column} value={column}>
                            {column}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>

            {missingRequired.length > 0 && (
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="font-medium text-red-800">Missing Required Fields:</span>
                </div>
                <ul className="text-sm text-red-700">
                  {missingRequired.map(field => (
                    <li key={field.systemField}>
                      • {systemFields.find(f => f.key === field.systemField)?.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex space-x-2">
              <Button
                onClick={generatePreview}
                disabled={!canProceed}
                className="bg-burgundy-800 hover:bg-burgundy-900"
              >
                Preview Import
              </Button>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Preview Import (First 5 Rows)</h4>
              <Badge variant="outline">
                {excelData.length} total rows to import
              </Badge>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Description</th>
                      <th className="px-3 py-2 text-left font-medium">Category</th>
                      <th className="px-3 py-2 text-left font-medium">Est. Cost</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {previewData.map((row, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2">{row.description || 'N/A'}</td>
                        <td className="px-3 py-2">{row.category || 'N/A'}</td>
                        <td className="px-3 py-2">${row.estimatedCost?.toLocaleString() || '0'}</td>
                        <td className="px-3 py-2">
                          <Badge className="text-xs">
                            {row.status || 'pending'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={finalizeImport}
                className="bg-green-600 hover:bg-green-700"
              >
                Import {excelData.length} Items
              </Button>
              <Button variant="outline" onClick={() => setStep('map')}>
                Back to Mapping
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}