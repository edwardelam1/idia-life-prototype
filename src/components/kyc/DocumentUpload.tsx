import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Upload, CheckCircle, Camera, FileText } from 'lucide-react';

interface DocumentUploadProps {
  onSubmit: (docType: string) => Promise<void>;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onSubmit }) => {
  const [documentType, setDocumentType] = useState('');
  const [uploaded, setUploaded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleUpload = () => {
    if (!documentType) return;
    setUploaded(true);
    setAnalyzing(true);

    // Simulate OCR analysis
    setTimeout(() => {
      setAnalyzing(false);
      setAnalyzed(true);
    }, 2500);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(documentType);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <FileText className="w-8 h-8 mx-auto text-primary" />
        <h3 className="text-lg font-bold text-foreground">Upload Identity Document</h3>
        <p className="text-sm text-muted-foreground">
          We'll verify your identity securely and quickly
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Document Type</Label>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger>
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="passport">Passport</SelectItem>
              <SelectItem value="drivers_license">Driver's License</SelectItem>
              <SelectItem value="national_id">National ID Card</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!uploaded ? (
          <Card className="border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors cursor-pointer"
                onClick={handleUpload}>
            <CardContent className="p-8 text-center">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Drag & drop or tap to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG or PDF • Max 10MB</p>
                </div>
                <div className="flex justify-center gap-2">
                  <Button variant="outline" size="sm" disabled={!documentType}>
                    <Camera className="w-4 h-4 mr-1" />
                    Capture
                  </Button>
                  <Button variant="outline" size="sm" disabled={!documentType}>
                    <Upload className="w-4 h-4 mr-1" />
                    Browse
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : analyzing ? (
          <Card className="border-primary/20">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Analyzing document via OCR...</p>
                  <p className="text-xs text-muted-foreground">This usually takes a few seconds</p>
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ) : analyzed ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Document verified successfully</p>
                  <p className="text-xs text-muted-foreground">
                    {documentType === 'passport' ? 'Passport' : documentType === 'drivers_license' ? "Driver's License" : 'National ID'} — All fields readable
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {analyzed && (
        <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Continue to Biometric Verification'}
        </Button>
      )}
    </div>
  );
};

export default DocumentUpload;
