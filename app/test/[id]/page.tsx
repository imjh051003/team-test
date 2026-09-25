"use client";

import { use, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase";

type Test = {
  id: string;
  nickname: string;
};

type QuestionType = "single" | "ranked";

type Question = {
  id: number;
  question: string;
  type: QuestionType;
  options: string[];
};

type Answer = {
  first: string;
  second: string | null;
};

type Answers = Record<number, Answer>;

const questions: Question[] = [
  {
    id: 1,
    question: "팀플이 시작됐다. 이 사람은 가장 먼저 뭘 할 것 같아?",
    type: "single",
    options: [
      "일정과 마감일을 정리하고 계획을 세운다.",
      "주제나 새로운 아이디어를 먼저 제안한다.",
      "관련 사례와 자료를 먼저 조사한다.",
      "해야 할 일을 정리하고 역할을 나눈다.",
      "팀원들의 의견과 선호를 먼저 물어본다.",
    ],
  },
  {
    id: 2,
    question: "회의가 10분째 제자리걸음이다. 이 사람은 어떻게 생각할까?",
    type: "single",
    options: [
      "“왜지?” 뭐 때문에 막혔는지 원인부터 생각한다.",
      "“뭐가 더 낫지?” 각 의견의 장단점을 따져본다.",
      "“둘 다 괜찮은데?” 서로의 의견을 합칠 방법을 생각한다.",
      "“분위기 안 좋은데…” 어떻게 분위기를 풀지 생각한다.",
      "“다른 방법 없나?” 새로운 해결 방법을 계속 생각한다.",
    ],
  },
  {
    id: 3,
    question: "이 사람이 회의에서 가장 자주 하는 행동은?",
    type: "ranked",
    options: [
      "아이디어를 낸다",
      "필요한 정보나 모르는 부분을 바로 확인한다",
      "여러 의견의 공통점과 차이를 정리한다",
      "현실적으로 가능한지 판단한다",
      "조용히 듣다가 핵심을 말한다",
    ],
  },
  {
    id: 4,
    question:
      "팀플 도중 예상치 못한 문제가 생겼다. 이 사람은 가장 먼저 어떻게 할 것 같아?",
    type: "ranked",
    options: [
      "필요한 일을 먼저 찾아서 움직인다",
      "왜 문제가 생겼는지 원인부터 파악한다",
      "팀원들과 해결 방법을 같이 논의한다",
      "기존 계획을 수정해서 새로운 방향을 잡는다",
      "우선순위를 정해서 급한 것부터 처리한다",
    ],
  },
  {
    id: 5,
    question: "팀플 마감 하루 전, 이 사람에게 가장 기대하게 되는 건?",
    type: "ranked",
    options: [
      "부족한 부분이 보이면 필요한 내용을 찾아 빠르게 보완한다",
      "어떻게든 자기 몫은 끝낸다",
      "진행 상황을 공유하며 다 같이 끝낼 수 있게 조율한다",
      "필요한 수정사항을 바로 반영해 결과물을 완성한다",
      "막힌 부분의 해결책을 가져온다",
      "지친 팀 분위기를 살려준다",
    ],
  },
  {
    id: 6,
    question: "다음 팀플에서도 이 사람과 함께하고 싶은 가장 큰 이유는?",
    type: "ranked",
    options: [
      "일을 믿고 맡길 수 있어서",
      "좋은 아이디어를 내서",
      "소통이 편해서",
      "문제 해결을 잘해서",
      "예상치 못한 상황에도 잘 대처해서",
      "팀을 잘 이끌어서",
    ],
  },
  {
    id: 7,
    question: "이 사람을 한 단계 레벨업시킬 수 있다면, 어떤 능력치를 올려줄래?",
    type: "ranked",
    options: [
      "아이디어",
      "분석력",
      "실행력",
      "발표력",
      "리더십",
      "소통 능력",
      "시간 관리",
    ],
  },
  {
    id: 8,
    question: "평소에 볼 때랑 팀플할 때, 이 사람은 어떻게 달라?",
    type: "single",
    options: [
      "생각보다 훨씬 적극적이야",
      "생각보다 꼼꼼하고 진지해",
      "은근히 주도적으로 이끌어",
      "평소보다 말과 의견이 많아져",
      "맡은 일에서는 책임감이 확 올라가",
      "주변 사람들을 더 잘 챙겨",
      "별 차이 없어. 평소 모습 그대로야",
    ],
  },
];

// 시작 화면 0, 프로젝트 입력 1, 질문 화면 2~9
const START_STEP = 0;
const PROJECT_STEP = 1;
const FIRST_QUESTION_STEP = 2;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function TestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 최신 Next.js App Router에서는 동적 route params가 Promise로 전달됩니다.
  const { id } = use(params);

  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState(START_STEP);
  const [respondentName, setRespondentName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [noProject, setNoProject] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // URL의 id로 설문 대상자 정보를 불러옵니다.
  useEffect(() => {
    let ignore = false;

    const loadTest = async () => {
      setLoading(true);
      setError("");

      // tests.id가 uuid이므로 잘못된 형식은 DB 조회 전에 처리합니다.
      if (!UUID_PATTERN.test(id)) {
        if (!ignore) {
          setTest(null);
          setError("not-found");
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error: selectError } = await supabase
          .from("tests")
          .select("id, nickname")
          .eq("id", id)
          .maybeSingle();

        if (selectError) {
          console.error("테스트 조회 오류:", selectError);

          if (!ignore) {
            setError("load-failed");
          }
          return;
        }

        if (!data) {
          if (!ignore) {
            setError("not-found");
          }
          return;
        }

        if (!ignore) {
          setTest(data);
        }
      } catch (caughtError) {
        console.error("테스트 조회 중 예외 발생:", caughtError);

        if (!ignore) {
          setError("load-failed");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadTest();

    return () => {
      ignore = true;
    };
  }, [id]);

  const currentQuestionIndex = step - FIRST_QUESTION_STEP;
  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id]
    : undefined;

  const canStart = isAnonymous || respondentName.trim().length > 0;

  const projectIsComplete = noProject || projectName.trim().length > 0;

  const answerIsComplete = currentQuestion
    ? currentQuestion.type === "single"
      ? Boolean(currentAnswer?.first)
      : Boolean(
          currentAnswer?.first &&
          currentAnswer?.second &&
          currentAnswer.first !== currentAnswer.second,
        )
    : false;

  const progress = currentQuestion
    ? (currentQuestion.id / questions.length) * 100
    : 0;

  const selectSingleAnswer = (questionId: number, option: string) => {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: {
        first: option,
        second: null,
      },
    }));
    setError("");
  };

  const selectRankedOption = (questionId: number, option: string) => {
  setAnswers((previous) => {
    const oldAnswer = previous[questionId] ?? {
      first: "",
      second: null,
    };

    // 이미 1순위로 선택한 항목을 다시 누르면 선택 취소
    if (oldAnswer.first === option) {
      return {
        ...previous,
        [questionId]: {
          first: "",
          second: oldAnswer.second,
        },
      };
    }

    // 이미 2순위로 선택한 항목을 다시 누르면 선택 취소
    if (oldAnswer.second === option) {
      return {
        ...previous,
        [questionId]: {
          first: oldAnswer.first,
          second: null,
        },
      };
    }

    // 첫 번째 클릭 → 1순위
    if (!oldAnswer.first) {
      return {
        ...previous,
        [questionId]: {
          first: option,
          second: oldAnswer.second,
        },
      };
    }

    // 두 번째 클릭 → 2순위
    if (!oldAnswer.second) {
      return {
        ...previous,
        [questionId]: {
          first: oldAnswer.first,
          second: option,
        },
      };
    }

    // 이미 2개를 선택했다면 아무 변화 없음
    return previous;
  });

  setError("");
};

  const goToNextQuestion = () => {
    if (!answerIsComplete) return;
    setError("");
    setStep((previous) => previous + 1);
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex <= 0 || submitting) return;
    setError("");
    setStep((previous) => previous - 1);
  };

  const handleSubmit = async () => {
    if (submitting || submitted || !test) return;

    if (!isAnonymous && !respondentName.trim()) {
      setError("이름 또는 닉네임을 입력해주세요.");
      return;
    }

    const allAnswersAreComplete = questions.every((question) => {
      const answer = answers[question.id];

      if (question.type === "single") {
        return Boolean(answer?.first);
      }

      return Boolean(
        answer?.first && answer?.second && answer.first !== answer.second,
      );
    });

    if (!projectIsComplete || !allAnswersAreComplete) {
      setError("아직 완료하지 않은 답변이 있어요.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // 1. 응답 묶음을 먼저 만들고 생성된 id를 받습니다.
      // 응답 ID를 브라우저에서 먼저 생성합니다.
const responseId = crypto.randomUUID();

const { error: responseError } = await supabase
  .from("responses")
  .insert({
    id: responseId,
    test_id: test.id,
    project_name: noProject ? "없음" : projectName.trim(),
    respondent_name: isAnonymous ? null : respondentName.trim(),
  });

      if (responseError) {
        console.error("responses 저장 오류:", responseError);
        setError("응답을 저장하는 중 문제가 발생했어요. 다시 시도해주세요.");
        return;
      }


      // 2. 8개 답변을 한 번에 저장합니다.
      const answerRows = questions.map((question) => ({
        response_id: responseId,
        question_number: question.id,
        first_choice: answers[question.id].first,
        second_choice:
          question.type === "ranked" ? answers[question.id].second : null,
      }));

      const { error: answersError } = await supabase
        .from("answers")
        .insert(answerRows);

      if (answersError) {
        console.error("answers 저장 오류:", answersError);
        setError("응답을 저장하는 중 문제가 발생했어요. 다시 시도해주세요.");
        return;
      }

      setSubmitted(true);
    } catch (caughtError) {
      console.error("응답 제출 중 예외 발생:", caughtError);
      setError("응답을 저장하는 중 문제가 발생했어요. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const optionClassName = (selected: boolean, disabled = false) =>
    `w-full rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition sm:text-base ${
      selected
        ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100"
        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50"
    } ${
      disabled
        ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 hover:border-slate-100 hover:bg-slate-50"
        : "cursor-pointer"
    }`;

  if (loading) {
    return (
      <PageShell>
        <div className="py-12 text-center" aria-live="polite">
          <div className="mx-auto mb-5 h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
          <p className="font-medium text-slate-600">
            테스트 정보를 불러오고 있어요...
          </p>
        </div>
      </PageShell>
    );
  }

  if (!test) {
    return (
      <PageShell>
        <div className="py-8 text-center">
          <div className="mb-4 text-5xl">🔍</div>
          <h1 className="text-2xl font-bold text-slate-900">
            테스트를 찾을 수 없어요.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
            {error === "load-failed"
              ? "테스트 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요."
              : "링크가 잘못되었거나 존재하지 않는 테스트일 수 있어요."}
          </p>
        </div>
      </PageShell>
    );
  }

  if (submitted) {
    return (
      <PageShell>
        <div className="py-8 text-center">
          <div className="mb-4 text-5xl">🎉</div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            응답 완료!
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            <span className="font-semibold text-slate-900">
              {test.nickname}
            </span>
            의 팀플 능력치 분석에
            <br />한 표를 보탰어요.
          </p>
          <p className="mt-3 text-sm text-slate-400">소중한 답변 감사합니다.</p>
        </div>
      </PageShell>
    );
  }

  if (step === START_STEP) {
    return (
      <PageShell>
        <div className="text-center">
          <div className="mb-4 text-5xl">👋</div>
          <h1 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
            {test.nickname}과 함께
            <br />팀 프로젝트를 해본 적 있나요?
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base">
            함께 프로젝트를 하며 느꼈던
            <br />
            <span className="font-medium text-slate-700">{test.nickname}</span>
            의 모습을 알려주세요.
          </p>
        </div>

        <div className="mt-7">
          <label
            htmlFor="respondent-name"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            이름 또는 닉네임
          </label>
          <input
            id="respondent-name"
            type="text"
            value={respondentName}
            maxLength={20}
            disabled={isAnonymous}
            onChange={(event) => {
              setRespondentName(event.target.value);
              setError("");
            }}
            placeholder="이름을 입력해주세요"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:placeholder:text-slate-300"
          />

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-4 py-3.5 transition hover:bg-slate-50">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(event) => {
                setIsAnonymous(event.target.checked);
                setError("");
              }}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              <span className="block font-medium text-slate-700">
                익명으로 응답하기
              </span>
              <span className="mt-1 block text-sm leading-5 text-slate-400">
                이름을 공개하지 않고 응답해요.
              </span>
            </span>
          </label>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!canStart) return;
            setError("");
            setStep(PROJECT_STEP);
          }}
          disabled={!canStart}
          className="mt-8 w-full rounded-xl bg-indigo-600 px-4 py-3.5 font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          시작하기
        </button>
      </PageShell>
    );
  }

  if (step === PROJECT_STEP) {
    return (
      <PageShell>
        <div>
          <div className="mb-3 text-4xl">📝</div>
          <h1 className="text-2xl font-bold leading-snug text-slate-900">
            {test.nickname}과 함께했던 프로젝트가 있다면 알려주세요.
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            어떤 경험을 바탕으로 답했는지 확인하는 데 사용돼요.
          </p>
        </div>

        <div className="mt-7">
          <label
            htmlFor="project-name"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            프로젝트명
          </label>
          <input
            id="project-name"
            type="text"
            value={projectName}
            disabled={noProject}
            onChange={(event) => {
              setProjectName(event.target.value);
              setError("");
            }}
            placeholder="프로젝트명을 입력해주세요"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          />

          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3.5 transition hover:bg-slate-50">
            <input
              type="checkbox"
              checked={noProject}
              onChange={(event) => {
                setNoProject(event.target.checked);
                setError("");
              }}
              className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-medium text-slate-700">없음</span>
          </label>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!projectIsComplete) return;
            setError("");
            setStep(FIRST_QUESTION_STEP);
          }}
          disabled={!projectIsComplete}
          className="mt-7 w-full rounded-xl bg-indigo-600 px-4 py-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          설문 시작하기
        </button>
      </PageShell>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const isLastQuestion = currentQuestion.id === questions.length;

  return (
    <PageShell>
      <div>
        <div className="flex items-center justify-between text-sm font-semibold">
          <span className="text-indigo-600">
            {currentQuestion.id} / {questions.length}
          </span>
          <span className="text-slate-400">{Math.round(progress)}% 완료</span>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <h1 className="mt-7 text-xl font-bold leading-snug text-slate-900 sm:text-2xl">
          {currentQuestion.question}
        </h1>

        {currentQuestion.type === "single" ? (
          <div className="mt-6 space-y-3">
            {currentQuestion.options.map((option) => {
              const selected = currentAnswer?.first === option;

              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectSingleAnswer(currentQuestion.id, option)}
                  className={optionClassName(selected)}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span>{option}</span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                        selected
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-300 text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
  <div className="mt-6">
    <p className="mb-4 text-sm text-slate-500">
      먼저 선택한 답변이 1순위, 다음 답변이 2순위가 돼요.
    </p>

    <div className="space-y-3">
      {currentQuestion.options.map((option) => {
        const isFirst = currentAnswer?.first === option;
        const isSecond = currentAnswer?.second === option;

        const hasTwoChoices =
          Boolean(currentAnswer?.first) &&
          Boolean(currentAnswer?.second);

        const disabled =
          hasTwoChoices && !isFirst && !isSecond;

        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() =>
              selectRankedOption(currentQuestion.id, option)
            }
            className={`w-full rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition sm:text-base ${
              isFirst
                ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100"
                : isSecond
                  ? "border-violet-500 bg-violet-50 text-violet-700 ring-2 ring-violet-100"
                  : disabled
                    ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50"
            }`}
          >
            <span className="flex items-center justify-between gap-3">
              <span>{option}</span>

              {isFirst && (
                <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white">
                  1순위
                </span>
              )}

              {isSecond && (
                <span className="rounded-full bg-violet-600 px-2.5 py-1 text-xs font-bold text-white">
                  2순위
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  </div>
)}

        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0 || submitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            이전
          </button>

          <button
            type="button"
            onClick={isLastQuestion ? handleSubmit : goToNextQuestion}
            disabled={!answerIsComplete || submitting}
            className="rounded-xl bg-indigo-600 px-4 py-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            {submitting
              ? "응답을 저장하고 있어요..."
              : isLastQuestion
                ? "제출하기"
                : "다음"}
          </button>
        </div>
      </div>
    </PageShell>
  );
}


function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4 py-8 sm:py-10">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          {children}
        </div>
        <p className="mt-5 text-center text-xs text-slate-400">
          팀원들과 함께한 모습을 솔직하게 알려주세요.
        </p>
      </div>
    </main>
  );
}
