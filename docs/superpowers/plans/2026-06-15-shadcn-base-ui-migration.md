# shadcn/ui (Base UI) + Tailwind CSS v4 迁移计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将前端从手写 Tailwind 工具类替换为 shadcn/ui (Base UI 基础) 组件库，同时保持 Tailwind CSS v4。

**Architecture:** 使用 shadcn/ui v4 的 base-nova 风格，基于 `@base-ui/react` 无头组件 + CVA 变体系统 + Tailwind v4 CSS 变量主题系统。通过 `cn()` 工具函数合并 class，通过 `@theme inline` 映射 OKLCH 色彩变量。

**Tech Stack:** Tailwind CSS v4, shadcn/ui v4 (base-nova), @base-ui/react, class-variance-authority, clsx, tailwind-merge, lucide-react, tw-animate-css

---

### Task 1: 安装新依赖 & 移除无用包

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: 安装 shadcn/ui 所需依赖**

```bash
cd D:/agents/HireMeAI/frontend && npm install shadcn class-variance-authority clsx tailwind-merge lucide-react tw-animate-css @base-ui/react
```

- [ ] **Step 2: 验证安装**

```bash
cd D:/agents/HireMeAI/frontend && node -e "require('class-variance-authority'); require('clsx'); require('tailwind-merge'); console.log('OK')"
```

---

### Task 2: 配置 TypeScript 路径别名

**Files:**
- Modify: `frontend/tsconfig.json`
- Modify: `frontend/tsconfig.app.json`
- Modify: `frontend/vite.config.ts`

- [ ] **Step 1: 更新 `tsconfig.json` — 添加 baseUrl 和 paths**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

- [ ] **Step 2: 更新 `vite.config.ts` — 添加 resolve.alias**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
```

- [ ] **Step 3: 验证别名生效**

```bash
cd D:/agents/HireMeAI/frontend && npx tsc --noEmit 2>&1 | head -5
```

---

### Task 3: 创建 components.json & 基础文件

**Files:**
- Create: `frontend/components.json`
- Create: `frontend/src/lib/utils.ts`

- [ ] **Step 1: 创建 `components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-nova",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 2: 创建 `src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

### Task 4: 重写全局 CSS — shadcn 主题系统

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: 替换 `src/index.css` 为完整 shadcn v4 主题**

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 2: 验证 CSS 无语法错误**

```bash
cd D:/agents/HireMeAI/frontend && npx tailwindcss --input src/index.css --output /dev/null 2>&1 | head -5
```

---

### Task 5: 创建 shadcn UI 组件

**Files:**
- Create: `frontend/src/components/ui/button.tsx`
- Create: `frontend/src/components/ui/card.tsx`
- Create: `frontend/src/components/ui/input.tsx`
- Create: `frontend/src/components/ui/textarea.tsx`
- Create: `frontend/src/components/ui/badge.tsx`
- Create: `frontend/src/components/ui/progress.tsx`

- [ ] **Step 1: 创建 `button.tsx`**

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "@base-ui/react/slot"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        xs: "h-6 px-2 text-xs",
        sm: "h-8 px-3",
        lg: "h-10 px-6",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
```

- [ ] **Step 2: 创建 `card.tsx`**

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-sm",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 p-6", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn("font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("p-6 pt-0", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

- [ ] **Step 3: 创建 `input.tsx`**

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
```

- [ ] **Step 4: 创建 `textarea.tsx`**

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
```

- [ ] **Step 5: 创建 `badge.tsx`**

```tsx
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
```

- [ ] **Step 6: 创建 `progress.tsx`**

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<"div"> & { value?: number }) {
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      {...props}
    >
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${value ?? 0}%` }}
      />
    </div>
  )
}

export { Progress }
```

---

### Task 6: 重构 Header 组件

**Files:**
- Modify: `frontend/src/components/layout/Header.tsx`

- [ ] **Step 1: 替换 Header 为 shadcn 风格**

```tsx
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const steps = [
  { path: '/', label: '上传简历' },
  { path: '/score', label: '评分优化' },
  { path: '/jd-match', label: 'JD匹配' },
  { path: '/interview', label: '面试准备' },
  { path: '/cover-letter', label: '求职信' },
];

export default function Header() {
  const location = useLocation();
  const sessionId = useAppStore((s) => s.sessionId);

  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-primary no-underline">
          HireMe.AI <span className="text-sm text-muted-foreground font-normal">职得</span>
        </Link>
        <nav className="flex gap-1">
          {steps.map((step) => {
            const active = location.pathname === step.path;
            const disabled = !sessionId && step.path !== '/';
            return (
              <Button
                key={step.path}
                variant={active ? 'secondary' : 'ghost'}
                size="sm"
                disabled={disabled}
                asChild
              >
                <Link to={disabled ? '#' : step.path}>
                  {step.label}
                </Link>
              </Button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
```

---

### Task 7: 重构 HomePage

**Files:**
- Modify: `frontend/src/pages/HomePage.tsx`

- [ ] **Step 1: 替换 HomePage 为 shadcn 组件**

```tsx
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useAppStore } from '@/store/appStore';
import { uploadResume, parseText } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

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
```

---

### Task 8: 重构 ResumePage

**Files:**
- Modify: `frontend/src/pages/ResumePage.tsx`

- [ ] **Step 1: 替换 ResumePage 为 shadcn 组件**

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useAppStore } from '@/store/appStore';
import { scoreResume, optimizeResume } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export default function ResumePage() {
  const { sessionId, scores, optimizedResume, setScores, setOptimizedResume } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [changes, setChanges] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionId) { navigate('/'); return; }
    if (!scores) {
      setLoading(true);
      scoreResume(sessionId).then(setScores).finally(() => setLoading(false));
    }
  }, [sessionId, scores, navigate, setScores]);

  const handleOptimize = async () => {
    if (!sessionId) return;
    setOptimizing(true);
    try {
      const res = await optimizeResume(sessionId);
      setOptimizedResume(res.optimized_text);
      setChanges(res.changes);
    } finally {
      setOptimizing(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">正在评分中...</div>;
  if (!scores) return null;

  const chartData = scores.dimensions.map((d) => ({ name: d.name, score: d.score }));

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>简历评分</CardTitle>
            <div className="text-3xl font-bold text-primary">{scores.overall}<span className="text-lg text-muted-foreground">/100</span></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/2 h-64">
              <ResponsiveContainer>
                <RadarChart data={chartData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar dataKey="score" stroke="oklch(0.488 0.243 264.376)" fill="oklch(0.488 0.243 264.376)" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-3">
              {scores.dimensions.map((d) => (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-24 shrink-0">{d.name}</span>
                  <Progress value={d.score} className="flex-1" />
                  <span className="text-sm font-medium w-8">{d.score}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-green-200 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="text-green-800 dark:text-green-200 text-base">优势</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-green-700 dark:text-green-300">
              {scores.strengths.map((s, i) => <li key={i}>• {s}</li>)}
            </ul>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950">
          <CardHeader>
            <CardTitle className="text-orange-800 dark:text-orange-200 text-base">待改进</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-orange-700 dark:text-orange-300">
              {scores.weaknesses.map((w, i) => <li key={i}>• {w}</li>)}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>AI 优化</CardTitle>
            <Button
              onClick={handleOptimize}
              disabled={optimizing}
              size="sm"
            >
              {optimizing ? '优化中...' : optimizedResume ? '重新优化' : '一键优化'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {changes.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium">修改说明：</h4>
              {changes.map((c, i) => <p key={i} className="text-sm text-muted-foreground">• {c}</p>)}
            </div>
          )}
          {optimizedResume && (
            <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
              {optimizedResume}
            </pre>
          )}
        </CardContent>
      </Card>

      <div className="text-center">
        <Button onClick={() => navigate('/jd-match')} size="lg">
          下一步：JD 匹配分析
        </Button>
      </div>
    </div>
  );
}
```

---

### Task 9: 重构 JDMatchPage

**Files:**
- Modify: `frontend/src/pages/JDMatchPage.tsx`

- [ ] **Step 1: 替换 JDMatchPage 为 shadcn 组件**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { matchJD, optimizeForJD } from '@/api/client';
import type { JDOptimizeResult } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function JDMatchPage() {
  const { sessionId, jdText, matchResult, setJdText, setMatchResult } = useAppStore();
  const [input, setInput] = useState(jdText || '');
  const [loading, setLoading] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<JDOptimizeResult | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const navigate = useNavigate();

  if (!sessionId) { navigate('/'); return null; }

  const handleMatch = async () => {
    if (input.trim().length < 20) return;
    setLoading(true);
    setJdText(input);
    try {
      const res = await matchJD(sessionId, input);
      setMatchResult(res);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      const res = await optimizeForJD(sessionId, input);
      setOptimizeResult(res);
    } finally {
      setOptimizing(false);
    }
  };

  const matchColor = matchResult
    ? matchResult.match_percentage >= 70 ? 'bg-green-500' : matchResult.match_percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
    : '';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>职位描述 (JD)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="粘贴目标职位的JD..."
            className="h-40 resize-none"
          />
          <Button
            onClick={handleMatch}
            disabled={loading || input.trim().length < 20}
          >
            {loading ? '分析中...' : '匹配分析'}
          </Button>
        </CardContent>
      </Card>

      {matchResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>匹配结果</CardTitle>
              <div className="text-2xl font-bold text-primary">{matchResult.match_percentage}%</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={matchResult.match_percentage} className={`h-3 [&>div]:${matchColor}`} />
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">已匹配技能</h4>
                <div className="flex flex-wrap gap-2">
                  {matchResult.matched_skills.map((s, i) => (
                    <Badge key={i} variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-200">{s}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">缺失技能</h4>
                <div className="flex flex-wrap gap-2">
                  {matchResult.missing_skills.map((s, i) => (
                    <Badge key={i} variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-200">{s}</Badge>
                  ))}
                </div>
              </div>
            </div>
            {matchResult.suggestions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">改进建议</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {matchResult.suggestions.map((s, i) => <li key={i}>• {s}</li>)}
                </ul>
              </div>
            )}
            <Button
              onClick={handleOptimize}
              disabled={optimizing}
              size="sm"
            >
              {optimizing ? '优化中...' : '针对JD优化简历'}
            </Button>
          </CardContent>
        </Card>
      )}

      {optimizeResult && (
        <Card>
          <CardHeader>
            <CardTitle>优化后简历 (预估匹配度: {optimizeResult.new_match_percentage}%)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">{optimizeResult.optimized_text}</pre>
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <Button onClick={() => navigate('/interview')} size="lg">
          下一步：面试准备
        </Button>
      </div>
    </div>
  );
}
```

---

### Task 10: 重构 InterviewPage

**Files:**
- Modify: `frontend/src/pages/InterviewPage.tsx`

- [ ] **Step 1: 替换 InterviewPage 为 shadcn 组件**

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { generateInterview } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function InterviewPage() {
  const { sessionId, jdText, interviewQuestions, setInterviewQuestions } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionId) { navigate('/'); return; }
    if (!jdText) { navigate('/jd-match'); return; }
    if (!interviewQuestions) {
      setLoading(true);
      generateInterview(sessionId, jdText).then((res) => setInterviewQuestions(res.questions)).finally(() => setLoading(false));
    }
  }, [sessionId, jdText, interviewQuestions, navigate, setInterviewQuestions]);

  if (loading) return <div className="text-center py-12 text-muted-foreground">正在生成面试题...</div>;
  if (!interviewQuestions) return null;

  const categories = [...new Set(interviewQuestions.map((q) => q.category))];

  const difficultyVariant = (d: string) => {
    if (d === '困难') return 'destructive';
    if (d === '中等') return 'secondary';
    return 'default';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">面试准备</h2>
      {categories.map((cat) => (
        <Card key={cat}>
          <CardHeader>
            <CardTitle>{cat}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {interviewQuestions.filter((q) => q.category === cat).map((q, i) => {
              const idx = interviewQuestions.indexOf(q);
              return (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start cursor-pointer" onClick={() => setExpanded(expanded === idx ? null : idx)}>
                    <p className="text-sm font-medium">{q.question}</p>
                    <Badge variant={difficultyVariant(q.difficulty)}>{q.difficulty}</Badge>
                  </div>
                  {expanded === idx && (
                    <div className="mt-3 pt-3 border-t text-sm text-muted-foreground bg-muted p-3 rounded">
                      <strong>回答策略：</strong> {q.answer_strategy}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
      <div className="text-center">
        <Button onClick={() => navigate('/cover-letter')} size="lg">
          下一步：生成求职信
        </Button>
      </div>
    </div>
  );
}
```

---

### Task 11: 重构 CoverLetterPage

**Files:**
- Modify: `frontend/src/pages/CoverLetterPage.tsx`

- [ ] **Step 1: 替换 CoverLetterPage 为 shadcn 组件**

```tsx
import { useState } from 'react';
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
  const navigate = useNavigate();

  if (!sessionId) { navigate('/'); return null; }
  if (!jdText) { navigate('/jd-match'); return null; }

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await generateCoverLetter(sessionId, jdText, companyName || undefined, positionName || undefined);
      setCoverLetter(res.cover_letter);
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
```

---

### Task 12: 重构 App.tsx 布局

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: 使用 shadcn 主题色彩**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from '@/components/layout/Header';
import HomePage from '@/pages/HomePage';
import ResumePage from '@/pages/ResumePage';
import JDMatchPage from '@/pages/JDMatchPage';
import InterviewPage from '@/pages/InterviewPage';
import CoverLetterPage from '@/pages/CoverLetterPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/score" element={<ResumePage />} />
            <Route path="/jd-match" element={<JDMatchPage />} />
            <Route path="/interview" element={<InterviewPage />} />
            <Route path="/cover-letter" element={<CoverLetterPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
```

- [ ] **Step 2: 将 `@/` 别名导入应用到 App.tsx**

注意：Task 2 已配置 `@/` 别名，此处所有 `./components/` 和 `./pages/` 路径均可改为 `@/components/` 和 `@/pages/`。

---

### Task 13: 验证构建 & 启动

- [ ] **Step 1: 终止旧前端进程并重新安装依赖**

```bash
taskkill /F /PID $(cat /tmp/frontend.pid 2>/dev/null) 2>/dev/null; cd D:/agents/HireMeAI/frontend && npm install
```

- [ ] **Step 2: TypeScript 类型检查**

```bash
cd D:/agents/HireMeAI/frontend && npx tsc --noEmit 2>&1
```
Expected: 无类型错误（或仅有未使用变量警告）

- [ ] **Step 3: Vite 构建**

```bash
cd D:/agents/HireMeAI/frontend && npm run build 2>&1
```
Expected: 构建成功

- [ ] **Step 4: 启动开发服务器**

```bash
cd D:/agents/HireMeAI/frontend && npm run dev &
```

- [ ] **Step 5: 验证首页可访问**

```bash
sleep 5 && curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
```
Expected: 200

---

### Self-Review Checklist

**1. Spec coverage:** 每个页面都已覆盖 — HomePage, ResumePage, JDMatchPage, InterviewPage, CoverLetterPage, Header, App 布局。所有手写 Tailwind 类均已替换为 shadcn 组件。

**2. Placeholder scan:** 无 TBD、TODO 或"待实现"标记。所有步骤都有具体代码或命令。

**3. Type consistency:** Button 的 `variant` 类型 (default/outline/secondary/ghost/link)、Card 子组件 (CardHeader/CardTitle/CardContent)、Badge variant (default/secondary/destructive/outline) 在所有任务中保持一致。
