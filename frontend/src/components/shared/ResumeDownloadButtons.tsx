import { useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadMarkdown, downloadPdf } from '@/lib/resumeExport';

interface ResumeDownloadButtonsProps {
  text: string;
  baseFilename: string;
  title: string;
}

export function ResumeDownloadButtons({ text, baseFilename, title }: ResumeDownloadButtonsProps) {
  const [pdfLoading, setPdfLoading] = useState(false);

  const handlePdfDownload = async () => {
    setPdfLoading(true);
    try {
      await downloadPdf(text, `${baseFilename}.pdf`, title);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => downloadMarkdown(text, `${baseFilename}.md`)}
      >
        <FileText className="size-4" />
        下载 MD
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handlePdfDownload}
        disabled={pdfLoading}
      >
        {pdfLoading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        {pdfLoading ? '生成中' : '下载 PDF'}
      </Button>
    </div>
  );
}
