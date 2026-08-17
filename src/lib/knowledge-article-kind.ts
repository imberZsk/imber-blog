/** 知识文章在学习路径中的用途。 */
export type KnowledgeArticleKind = 'guide' | 'lesson' | 'practice' | 'reference'

/** 去掉课程序号后仍属于查阅型资料的文件名。 */
const REFERENCE_ARTICLE_FILE_PATTERN =
  /(?:陷阱对照|常用命令|常用库和框架|速查表|速查手册|术语表|问题排查清单|学习资料链接|疑问记录|运行指南|项目结构速查|代码审查要点|配置模板)$/

/**
 * 去掉路径分段前用于排序的数字编号。
 * @param pathSegment 可能带两位排序号的目录或文件名。
 * @returns 用于识别文章用途的稳定名称。
 */
function stripKnowledgeOrderPrefix(pathSegment: string): string {
  return pathSegment.replace(/^\d{2}[-_\s]*/, '')
}

/**
 * 根据统一路径规则识别文章是指南、课程、实验还是参考资料。
 * @param sourceArticlePath 不含扩展名的知识库相对路径。
 * @returns 页面、题目审计和两级思维导图共用的文章用途。
 */
export function getKnowledgeArticleKind(sourceArticlePath: string): KnowledgeArticleKind {
  /** 当前文章路径的全部分段。 */
  const pathSegments = sourceArticlePath.split('/')
  /** 当前文章不含目录和扩展名的文件名。 */
  const fileName = pathSegments.at(-1) || ''

  if (
    fileName.startsWith('00-') ||
    fileName === 'course' ||
    fileName.endsWith('-学习指南') ||
    sourceArticlePath === 'index'
  ) {
    return 'guide'
  }

  if (pathSegments.includes('lab')) {
    return 'practice'
  }

  if (
    fileName.startsWith('98-') ||
    fileName.startsWith('99-') ||
    pathSegments.some((pathSegment) => pathSegment.startsWith('98-') || pathSegment.startsWith('99-')) ||
    pathSegments.includes('appendices') ||
    pathSegments.some((pathSegment) => stripKnowledgeOrderPrefix(pathSegment) === '附录') ||
    pathSegments.includes('extras') ||
    pathSegments.includes('raw') ||
    REFERENCE_ARTICLE_FILE_PATTERN.test(stripKnowledgeOrderPrefix(fileName))
  ) {
    return 'reference'
  }

  return 'lesson'
}
