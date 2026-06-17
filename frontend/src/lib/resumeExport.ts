const PDF_WIDTH_PX = 794;
const PDF_PADDING_PX = 56;

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function createPdfSource(text: string, title: string) {
  const source = document.createElement('section');
  source.style.position = 'fixed';
  source.style.left = '-10000px';
  source.style.top = '0';
  source.style.width = `${PDF_WIDTH_PX}px`;
  source.style.padding = `${PDF_PADDING_PX}px`;
  source.style.background = '#ffffff';
  source.style.color = '#111827';
  source.style.fontFamily = [
    'ui-sans-serif',
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    '"Microsoft YaHei"',
    '"PingFang SC"',
    'sans-serif',
  ].join(', ');
  source.style.lineHeight = '1.65';
  source.style.boxSizing = 'border-box';

  const heading = document.createElement('h1');
  heading.textContent = title;
  heading.style.margin = '0 0 24px';
  heading.style.fontSize = '24px';
  heading.style.lineHeight = '1.25';
  heading.style.fontWeight = '700';
  heading.style.color = '#0f172a';

  const body = document.createElement('div');
  body.textContent = text;
  body.style.whiteSpace = 'pre-wrap';
  body.style.fontSize = '14px';
  body.style.overflowWrap = 'break-word';

  source.append(heading, body);
  document.body.appendChild(source);
  return source;
}

export function downloadMarkdown(text: string, filename: string) {
  triggerDownload(new Blob([`\ufeff${text}`], { type: 'text/markdown;charset=utf-8' }), filename);
}

export async function downloadPdf(text: string, filename: string, title: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  const source = createPdfSource(text, title);

  try {
    const canvas = await html2canvas(source, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
    });
    const image = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const imageWidth = pageWidth - margin * 2;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;
    const pageContentHeight = pageHeight - margin * 2;

    let heightLeft = imageHeight;
    let y = margin;
    pdf.addImage(image, 'PNG', margin, y, imageWidth, imageHeight);
    heightLeft -= pageContentHeight;

    while (heightLeft > 0) {
      pdf.addPage();
      y = margin - (imageHeight - heightLeft);
      pdf.addImage(image, 'PNG', margin, y, imageWidth, imageHeight);
      heightLeft -= pageContentHeight;
    }

    pdf.save(filename);
  } finally {
    source.remove();
  }
}
