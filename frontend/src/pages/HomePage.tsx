import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { uploadResume, parseText } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string } } }).response;
    return response?.data?.detail || fallback;
  }
  return fallback;
}

export default function HomePage() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState<null | 'upload' | 'paste'>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const setSession = useAppStore((s) => s.setSession);
  const { sessionId, resumeFileName, resumeText } = useAppStore();

  const onDrop = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setLoading('upload');
    setError('');
    try {
      const res = await uploadResume(files[0]);
      setSession(res.session_id, res.text, res.filename);
      navigate('/score');
    } catch (error: unknown) {
      setError(getErrorMessage(error, '上传失败，请重试'));
    } finally {
      setLoading(null);
    }
  }, [navigate, setSession]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handlePaste = async () => {
    if (text.trim().length < 50) {
      setError('简历内容至少需要 50 个字符');
      return;
    }
    setLoading('paste');
    setError('');
    try {
      const res = await parseText(text);
      setSession(res.session_id, res.text, res.filename);
      navigate('/score');
    } catch (error: unknown) {
      setError(getErrorMessage(error, '解析失败，请重试'));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-[760px] mx-auto">
      <div className="mb-7">
        <div className="eyebrow">STEP 01 · 简历输入</div>
        <h1 className="page-title">上传你的简历</h1>
        <p className="page-sub">
          支持 PDF 或 DOCX（≤ 10MB），也可以直接粘贴文本。解析完成后会作为后续评分、匹配、面试与求职信的统一输入。
        </p>
      </div>

      {/* 已上传状态预览 */}
      {sessionId && resumeText && (
        <div
          className="flex items-center gap-3.5 p-4 rounded-2xl mb-6 fade-up"
          style={{ background: 'var(--primary-soft)', border: '1px solid var(--primary-tint)' }}
        >
          <div
            className="grid place-items-center shrink-0"
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'var(--primary-soft)', color: 'var(--primary)',
            }}
          >
            <FileText className="w-[18px] h-[18px]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[14px] truncate">{resumeFileName || '已粘贴的简历文本'}</div>
            <div className="text-muted-foreground text-[12px] mt-0.5">
              已解析 · {resumeText.length.toLocaleString()} 字
            </div>
          </div>
          <Button size="sm" onClick={() => navigate('/score')}>查看评分 →</Button>
        </div>
      )}

      {/* 拖拽上传区 */}
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'drag' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="dropzone-icon">
          <Upload className="w-[22px] h-[22px]" />
        </div>
        <div className="font-semibold text-[17px] mb-1.5">
          {loading === 'upload' ? '正在解析...' : isDragActive ? '松开即可上传' : '拖拽简历到此处，或点击选择文件'}
        </div>
        <div className="text-muted-foreground text-[13px]">支持 PDF / DOCX · 最大 10MB · 内容仅本地保存</div>
      </div>

      <div className="flex justify-center gap-3.5 mt-6">
        {['PDF', 'DOCX', '自动解析', '本地存储'].map((b) => (
          <span
            key={b}
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ background: 'var(--secondary)', color: 'var(--muted-foreground)' }}
          >
            {b}
          </span>
        ))}
      </div>

      <div className="my-8 h-px" style={{ background: 'var(--border)' }} />

      {/* 粘贴文本 */}
      <div className="section-title">或者，直接粘贴简历文本</div>
      <div className="card p-6 rounded-2xl border bg-card">
        <div className="mb-4">
          <label className="block font-semibold text-[13px] mb-1.5">简历正文</label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'例如：\n\n张三 | 13800000000 | zhangsan@email.com\n求职意向：高级前端工程师\n\n工作经历\n2022.07 — 至今    字节跳动    前端工程师\n…'}
            className="min-h-[200px] resize-y leading-relaxed"
          />
          <div className="text-[12px] text-muted-foreground mt-1.5">粘贴后点击"解析并继续"，系统会自动抽取结构化字段。</div>
        </div>
        <div className="flex justify-between items-center">
          <div className="text-[12px] text-muted-foreground">
            已粘贴 <span className="font-mono tabular-nums">{text.length}</span> 字
          </div>
          <Button
            onClick={handlePaste}
            disabled={loading === 'paste' || text.trim().length < 50}
          >
            {loading === 'paste' ? '解析中...' : '解析并继续 →'}
          </Button>
        </div>
      </div>

      {error && (
        <div
          className="mt-5 p-3 rounded-lg text-sm text-center"
          style={{ background: 'oklch(95% 0.04 28)', color: 'var(--destructive)' }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
