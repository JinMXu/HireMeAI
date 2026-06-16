import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { generateCoverLetter } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function CoverLetterPage() {
  const { sessionId, jdText, coverLetter, setCoverLetter } = useAppStore();
  const [companyName, setCompanyName] = useState('');
  const [positionName, setPositionName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
    } else if (!jdText) {
      navigate('/jd-match');
    }
  }, [sessionId, jdText, navigate]);

  if (!sessionId || !jdText) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await generateCoverLetter(sessionId, jdText, companyName || undefined, positionName || undefined);
      setCoverLetter(res.cover_letter);
    } catch {
      setError('求职信生成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>生成求职信</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="公司名称（可选）"
            />
            <Input
              value={positionName}
              onChange={(e) => setPositionName(e.target.value)}
              placeholder="应聘职位（可选）"
            />
          </div>
          <Button
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? '生成中...' : coverLetter ? '重新生成' : '生成求职信'}
          </Button>
          {error && (
            <div className="flex items-center gap-3 text-sm text-destructive">
              <span>{error}</span>
              <Button onClick={handleGenerate} variant="outline" size="sm" disabled={loading}>
                重试生成
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {coverLetter && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>求职信</CardTitle>
              <Button
                variant="link"
                size="sm"
                onClick={() => navigator.clipboard.writeText(coverLetter)}
              >
                复制
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">
              {coverLetter}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
