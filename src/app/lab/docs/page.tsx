import { getFrontendDocs } from '@/lib/frontend-docs'
import { DocsBrowser } from '@/components/lab/docs-browser'

/** 展示原技术文档分类和全文检索入口。 */
export default function FrontendDocsPage() {
  return <DocsBrowser docs={getFrontendDocs()} />
}
