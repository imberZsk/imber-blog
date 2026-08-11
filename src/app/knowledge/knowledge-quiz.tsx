'use client'

import { useState } from 'react'
import { CheckCircle2, CircleHelp, RotateCcw, XCircle } from 'lucide-react'
import { Button } from '@/components/ui'
import type { KnowledgeQuizQuestion } from '@/lib/knowledge-quiz'

/** 文章测验组件接收的核心知识题。 */
interface KnowledgeQuizProps {
  /** 当前文章需要作答的一到数道题。 */
  questions: KnowledgeQuizQuestion[]
}

/** 每道题当前选择的选项标识。 */
type QuizSelections = Record<string, string[]>

/** 已经提交并可显示答案的题目标识集合。 */
type SubmittedQuestionIds = Set<string>

/**
 * 比较用户选择与正确答案是否完全一致。
 * @param question 当前需要判断的知识题。
 * @param selectedOptionIds 用户为当前题选择的选项标识。
 */
function isCorrectSelection(question: KnowledgeQuizQuestion, selectedOptionIds: string[]): boolean {
  /** 题目中全部正确选项的标识。 */
  const correctOptionIds = question.options.filter((option) => option.isCorrect).map((option) => option.id)

  return (
    selectedOptionIds.length === correctOptionIds.length &&
    correctOptionIds.every((optionId) => selectedOptionIds.includes(optionId))
  )
}

/**
 * 渲染文章底部的紧凑核心知识测验。
 * @param props 当前文章对应的题目集合。
 */
export function KnowledgeQuiz({ questions }: KnowledgeQuizProps) {
  /** 每道题当前选择的答案。 */
  const [selections, setSelections] = useState<QuizSelections>({})
  /** 已提交并显示判题结果的题目标识。 */
  const [submittedQuestionIds, setSubmittedQuestionIds] = useState<SubmittedQuestionIds>(new Set())

  /**
   * 更新一道单选或多选题的当前答案。
   * @param question 当前发生选择变化的题目。
   * @param optionId 用户操作的选项标识。
   * @param isSelected 多选框操作后是否处于选中状态。
   */
  const updateSelection = (question: KnowledgeQuizQuestion, optionId: string, isSelected: boolean): void => {
    setSelections((currentSelections) => {
      /** 当前题变化前已经选择的选项。 */
      const currentOptionIds = currentSelections[question.id] || []
      /** 根据题型和本次操作得到的新答案。 */
      const nextOptionIds =
        question.type === 'single'
          ? [optionId]
          : isSelected
            ? [...currentOptionIds, optionId]
            : currentOptionIds.filter((currentOptionId) => currentOptionId !== optionId)

      return { ...currentSelections, [question.id]: nextOptionIds }
    })

    setSubmittedQuestionIds((currentQuestionIds) => {
      /** 修改答案后隐藏当前题旧结果，避免反馈与选择不一致。 */
      const nextQuestionIds = new Set(currentQuestionIds)
      nextQuestionIds.delete(question.id)
      return nextQuestionIds
    })
  }

  /**
   * 提交一道已经完成选择的题目。
   * @param questionId 当前需要判题的题目标识。
   */
  const submitQuestion = (questionId: string): void => {
    setSubmittedQuestionIds((currentQuestionIds) => new Set(currentQuestionIds).add(questionId))
  }

  /**
   * 清空一道题的答案和判题状态。
   * @param questionId 当前需要重新作答的题目标识。
   */
  const resetQuestion = (questionId: string): void => {
    setSelections((currentSelections) => ({ ...currentSelections, [questionId]: [] }))
    setSubmittedQuestionIds((currentQuestionIds) => {
      /** 重新作答时仅移除当前题状态，不影响文章中的其他题。 */
      const nextQuestionIds = new Set(currentQuestionIds)
      nextQuestionIds.delete(questionId)
      return nextQuestionIds
    })
  }

  return (
    <section className="knowledge-quiz" aria-labelledby="knowledge-quiz-title">
      <div className="flex items-center gap-2">
        <CircleHelp className="text-mint size-4" aria-hidden="true" />
        <h2 id="knowledge-quiz-title">学完自测</h2>
      </div>
      <p className="knowledge-quiz-intro">用一道实践判断题检验对本课知识的理解。</p>

      <div className="space-y-8">
        {questions.map((question, questionIndex) => {
          /** 当前题已经选择的答案。 */
          const selectedOptionIds = selections[question.id] || []
          /** 当前题是否已提交判题。 */
          const isSubmitted = submittedQuestionIds.has(question.id)
          /** 当前题提交后的正确性。 */
          const isCorrect = isSubmitted && isCorrectSelection(question, selectedOptionIds)
          /** 当前题使用原生单选框或复选框。 */
          const inputType = question.type === 'single' ? 'radio' : 'checkbox'

          return (
            <fieldset key={question.id} className="space-y-3">
              <legend className="text-foreground w-full text-[15px] leading-6 font-semibold">
                {questions.length > 1 && <span className="text-mint mr-2 font-mono text-xs">{questionIndex + 1}</span>}
                {question.prompt}
                <span className="text-muted-foreground ml-2 text-xs font-normal">
                  {question.type === 'multiple' ? '多选' : '单选'}
                </span>
              </legend>

              <div className="grid gap-2">
                {question.options.map((option) => {
                  /** 当前选项是否已被用户选中。 */
                  const isSelected = selectedOptionIds.includes(option.id)
                  /** 提交后，正确答案和误选答案使用不同反馈色。 */
                  const resultClassName = !isSubmitted
                    ? 'border-border hover:border-mint/60 hover:bg-mint/5'
                    : option.isCorrect
                      ? 'border-mint/60 bg-mint/10'
                      : isSelected
                        ? 'border-destructive/50 bg-destructive/5'
                        : 'border-border opacity-60'

                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border px-3.5 py-3 text-sm transition-colors ${resultClassName}`}
                    >
                      <input
                        type={inputType}
                        name={`knowledge-quiz-${question.id}`}
                        value={option.id}
                        checked={isSelected}
                        className="accent-mint mt-0.5 size-4 shrink-0"
                        onChange={(event) => updateSelection(question, option.id, event.currentTarget.checked)}
                      />
                      <span className="text-foreground min-w-0 leading-5">
                        <span className="text-mint mr-2 font-mono text-xs font-semibold">{option.id}</span>
                        {option.label}
                      </span>
                    </label>
                  )
                })}
              </div>

              <div className="flex min-h-9 items-center gap-3 pt-1">
                {isSubmitted ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => resetQuestion(question.id)}>
                    <RotateCcw aria-hidden="true" />
                    重新作答
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={selectedOptionIds.length === 0}
                    onClick={() => submitQuestion(question.id)}
                  >
                    提交答案
                  </Button>
                )}
              </div>

              {isSubmitted && (
                <div
                  className={`flex items-start gap-2 rounded-md px-3 py-2.5 text-sm ${
                    isCorrect ? 'bg-mint/10 text-foreground' : 'bg-destructive/5 text-foreground'
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {isCorrect ? (
                    <CheckCircle2 className="text-mint mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <XCircle className="text-destructive mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  )}
                  <span>
                    <strong className="mr-1">{isCorrect ? '回答正确。' : '再想一想。'}</strong>
                    {question.explanation}
                  </span>
                </div>
              )}
            </fieldset>
          )
        })}
      </div>
    </section>
  )
}
