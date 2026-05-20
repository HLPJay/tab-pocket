export const PRESET_TAGS: string[] = [
  'AI工具',
  '开发文档',
  '产品参考',
  '备案资料',
  '云服务',
  '视频',
  '代码仓库',
  '其他',
]

const rules: Array<{ pattern: RegExp; tag: string }> = [
  { pattern: /github\.com/i, tag: '代码仓库' },
  { pattern: /developer\.chrome\.com|wxt\.dev|docs\./i, tag: '开发文档' },
  { pattern: /chatgpt\.com|gemini\.google\.com|claude\.ai/i, tag: 'AI工具' },
  { pattern: /aliyun\.com|cloud\.tencent\.com|vercel\.com/i, tag: '云服务' },
  { pattern: /beian\.miit\.gov\.cn|beian\.gov\.cn/i, tag: '备案资料' },
  { pattern: /youtube\.com|bilibili\.com/i, tag: '视频' },
]

export function suggestTagForUrl(url: string): string | undefined {
  try {
    const hostname = new URL(url).hostname
    for (const { pattern, tag } of rules) {
      if (pattern.test(hostname)) return tag
    }
    return undefined
  } catch {
    return undefined
  }
}
