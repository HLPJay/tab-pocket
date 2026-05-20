import { describe, it, expect } from 'vitest'
import { suggestTagForUrl, PRESET_TAGS } from '../src/services/tagSuggestionService'

describe('suggestTagForUrl', () => {
  it('github.com → 代码仓库', () => {
    expect(suggestTagForUrl('https://github.com/anthropics/claude')).toBe('代码仓库')
  })

  it('developer.chrome.com → 开发文档', () => {
    expect(suggestTagForUrl('https://developer.chrome.com/docs/extensions')).toBe('开发文档')
  })

  it('wxt.dev → 开发文档', () => {
    expect(suggestTagForUrl('https://wxt.dev/guide/installation')).toBe('开发文档')
  })

  it('docs.* subdomain → 开发文档', () => {
    expect(suggestTagForUrl('https://docs.example.com/api')).toBe('开发文档')
  })

  it('chatgpt.com → AI工具', () => {
    expect(suggestTagForUrl('https://chatgpt.com/c/test')).toBe('AI工具')
  })

  it('gemini.google.com → AI工具', () => {
    expect(suggestTagForUrl('https://gemini.google.com/app')).toBe('AI工具')
  })

  it('claude.ai → AI工具', () => {
    expect(suggestTagForUrl('https://claude.ai/chat/test')).toBe('AI工具')
  })

  it('aliyun.com → 云服务', () => {
    expect(suggestTagForUrl('https://www.aliyun.com/product/ecs')).toBe('云服务')
  })

  it('cloud.tencent.com → 云服务', () => {
    expect(suggestTagForUrl('https://cloud.tencent.com/product/cvm')).toBe('云服务')
  })

  it('vercel.com → 云服务', () => {
    expect(suggestTagForUrl('https://vercel.com/dashboard')).toBe('云服务')
  })

  it('beian.miit.gov.cn → 备案资料', () => {
    expect(suggestTagForUrl('https://beian.miit.gov.cn')).toBe('备案资料')
  })

  it('youtube.com → 视频', () => {
    expect(suggestTagForUrl('https://www.youtube.com/watch?v=abc')).toBe('视频')
  })

  it('bilibili.com → 视频', () => {
    expect(suggestTagForUrl('https://www.bilibili.com/video/BV1')).toBe('视频')
  })

  it('returns undefined for unmatched URL', () => {
    expect(suggestTagForUrl('https://example.com/blog')).toBeUndefined()
  })

  it('does not throw for invalid URL', () => {
    expect(() => suggestTagForUrl('not-a-url')).not.toThrow()
    expect(suggestTagForUrl('not-a-url')).toBeUndefined()
  })

  it('does not throw for empty string', () => {
    expect(() => suggestTagForUrl('')).not.toThrow()
  })
})

describe('PRESET_TAGS', () => {
  it('contains expected tags', () => {
    expect(PRESET_TAGS).toContain('AI工具')
    expect(PRESET_TAGS).toContain('开发文档')
    expect(PRESET_TAGS).toContain('代码仓库')
    expect(PRESET_TAGS).toContain('云服务')
    expect(PRESET_TAGS).toContain('视频')
    expect(PRESET_TAGS).toContain('备案资料')
  })
})
