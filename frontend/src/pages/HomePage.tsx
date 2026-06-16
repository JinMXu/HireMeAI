import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useAppStore } from '@/store/appStore';
import { uploadResume, parseText } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function HomePage() {
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const setSession = useAppStore((s) => s.setSession);

  const onDrop = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setLoading(true);
    setError('');
    try {
      const res = await uploadResume(files[0]);
      setSession(res.session_id, res.text, res.filename);
      navigate('/score');
    } catch (e: any) {
      setError(e.response?.data?.detail || '上传失败，请重试');
    } finally {
      setLoading(false);
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
      setError('简历内容至少需要50个字符');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await parseText(text);
      setSession(res.session_id, res.text, res.filename);
      navigate('/score');
    } catch (e: any) {
      setError(e.response?.data?.detail || '解析失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">HireMe.AI 职得</h1>
        <p className="text-muted-foreground">AI驱动的全流程简历优化工具</p>
      </div>

      <div className="flex gap-4 mb-6 justify-center">
        <Button
          variant={mode === 'upload' ? 'default' : 'secondary'}
          onClick={() => setMode('upload')}
        >
          上传文件
        </Button>
        <Button
          variant={mode === 'paste' ? 'default' : 'secondary'}
          onClick={() => setMode('paste')}
        >
          粘贴文本
        </Button>
      </div>

      {mode === 'upload' ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <p className="text-muted-foreground text-lg">
            {isDragActive ? '松开即可上传' : '拖拽简历文件到此处，或点击选择'}
          </p>
          <p className="text-muted-foreground text-sm mt-2">支持 PDF、Word 格式，最大 10MB</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="将简历内容粘贴到此处..."
            className="h-64 resize-none"
          />
          <Button
            onClick={handlePaste}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? '解析中...' : '开始分析'}
          </Button>
        </div>
      )}

      {loading && mode === 'upload' && (
        <p className="text-center text-primary mt-4">正在解析简历...</p>
      )}
      {error && <p className="text-center text-destructive mt-4">{error}</p>}
    </div>
  );
}
