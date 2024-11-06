import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Table } from 'lucide-react';
import * as PDFJS from 'pdfjs-dist';

PDFJS.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS.version}/pdf.worker.min.js`;

const DiamondPriceViewer = () => {
  const [priceData, setPriceData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [debugText, setDebugText] = useState(''); // For debugging

  const parseTableData = (content) => {
    // Split content into lines and clean up
    const lines = content.split('\n').map(line => line.trim());
    const tables = {};
    let currentTable = null;
    let currentData = [];
    let colorGrades = [];
    
    for (const line of lines) {
      console.log("Processing line:", line); // Debug log

      // Detect table headers
      if (line.includes('RAPAPORT :')) {
        if (currentTable && currentData.length > 0) {
          tables[currentTable] = {
            colorGrades,
            data: currentData
          };
          currentData = [];
        }
        currentTable = line.split('RAPAPORT :')[1]?.split(':')[0]?.trim();
        console.log("Found table:", currentTable); // Debug log
      }
      
      // Detect color grades (D-F, G-H, etc.)
      if (line.includes('D-F') || line.includes('G-H') || line.includes('I-J')) {
        colorGrades = line.split(/\s+/).filter(grade => 
          grade.includes('-') || 
          ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'].includes(grade)
        );
        console.log("Found color grades:", colorGrades); // Debug log
      }

      // Process data lines
      const values = line.split(/\s+/);
      if (values.length >= 8 && !isNaN(values[0]) && !line.includes('RAPAPORT')) {
        const numericValues = values
          .filter(val => !isNaN(val))
          .map(val => parseFloat(val));
        
        if (numericValues.length > 0) {
          currentData.push({
            values: numericValues
          });
          console.log("Added data row:", numericValues); // Debug log
        }
      }
    }
    
    // Add last table
    if (currentTable && currentData.length > 0) {
      tables[currentTable] = {
        colorGrades,
        data: currentData
      };
    }
    
    return tables;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsLoading(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFJS.getDocument({ data: arrayBuffer }).promise;
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + '\n';
        }

        setDebugText(fullText); // Store extracted text for debugging
        console.log("Extracted text:", fullText);
        const parsedData = parseTableData(fullText);
        console.log("Parsed data:", parsedData);
        setPriceData(parsedData);
      } catch (error) {
        console.error('Error processing PDF:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const renderTable = (tableData, title) => {
    if (!tableData || !tableData.data || tableData.data.length === 0) return null;
    
    return (
      <div className="overflow-x-auto">
        <div className="text-lg font-semibold mb-2">{title}</div>
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              {tableData.colorGrades.map((grade, i) => (
                <th key={i} className="border p-2 bg-gray-100">
                  {grade}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.data.map((row, idx) => (
              <tr key={idx}>
                {row.values.map((value, cellIdx) => (
                  <td key={cellIdx} className="border p-2 text-center">
                    {value.toFixed(1)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle>Diamond Price Tables</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-violet-50 file:text-violet-700
              hover:file:bg-violet-100"
          />
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin mr-2">
              <Table className="w-6 h-6" />
            </div>
            Loading price data...
          </div>
        ) : (
          <div className="space-y-4">
            {priceData && 
              Object.entries(priceData).map(([title, data]) => (
                <div key={title} className="mb-6">
                  {renderTable(data, title)}
                </div>
              ))
            }
            {(!priceData || Object.keys(priceData).length === 0) && (
              <div className="text-center text-lg text-slate-500">
                No price data found in the uploaded file.
              </div>
            )}
            
            {/* Debug section */}
            <div className="mt-8 p-4 bg-gray-100 rounded">
              <h3 className="font-semibold mb-2">Extracted Text (Debug):</h3>
              <pre className="whitespace-pre-wrap text-xs">
                {debugText}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DiamondPriceViewer;