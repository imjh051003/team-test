"use client";

import { use, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Test = {
  id: string;
  nickname: string;
  result_key: string;
};

type ResponseRow = {
  id: string;
  respondent_name: string | null;
  project_name: string;
  created_at: string;
};

type AnswerRow = {
  response_id: string;
  question_number: number;
  first_choice: string;
  second_choice: string | null;
};

type QuestionType = "single" | "ranked";

type Question = {
  id: number;
  question: string;
  resultTitle: string;
  type: QuestionType;
  options: readonly string[];
  descriptions?: Readonly<Record<string, string>>;
};

type Competency =
  | "문제해결력"
  | "의사소통 능력"
  | "협업 능력"
  | "창의성"
  | "분석적 사고"
  | "논리적 사고"
  | "실행력"
  | "주도성"
  | "책임감"
  | "적응력"
  | "학습 능력";

type CompetencyScore = {
  competency: Competency;
  totalScore: number;
  q3Score: number;
  q6Score: number;
  firstChoiceCount: number;
};

type OptionStat = {
  option: string;
  firstCount: number;
  firstPercent: number;
  secondCount: number;
  secondPercent: number;
  weightedScore: number;
};

type QuestionStat = {
  question: Question;
  options: OptionStat[];
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// 참여 페이지와 결과 페이지에서 선택지 문구가 완전히 같아야 합니다.
// 참여 페이지 문구를 바꿀 때 이 배열도 함께 수정해주세요.
const QUESTIONS: readonly Question[] = [
  {
    id: 1,
    type: "single",
    question: "팀플이 시작됐다. 이 사람은 가장 먼저 뭘 할 것 같아?",
    resultTitle: "🚀 팀플에서 나의 첫 행동",
    options: [
      "일정과 마감일을 정리하고 계획을 세운다.",
      "주제나 새로운 아이디어를 먼저 제안한다.",
      "관련 사례와 자료를 먼저 조사한다.",
      "해야 할 일을 정리하고 역할을 나눈다.",
      "팀원들의 의견과 선호를 먼저 물어본다.",
    ],
    descriptions: {
      "일정과 마감일을 정리하고 계획을 세운다.": "계획적 · 체계적 · 일정관리",
      "주제나 새로운 아이디어를 먼저 제안한다.": "창의적 · 아이디어 중심 · 적극적",
      "관련 사례와 자료를 먼저 조사한다.": "분석적 · 탐구적 · 정보탐색",
      "해야 할 일을 정리하고 역할을 나눈다.": "주도적 · 추진력 · 리더십",
      "팀원들의 의견과 선호를 먼저 물어본다.": "소통적 · 배려 · 조율 능력",
    },
  },
  {
    id: 2,
    type: "single",
    question: "회의가 10분째 제자리걸음이다. 이 사람은 어떻게 생각할까?",
    resultTitle: "🧭 팀플의 흐름을 바꾸는 방식",
    options: [
      "“왜지?” 뭐 때문에 막혔는지 원인부터 생각한다.",
      "“뭐가 더 낫지?” 각 의견의 장단점을 따져본다.",
      "“둘 다 괜찮은데?” 서로의 의견을 합칠 방법을 생각한다.",
      "“분위기 안 좋은데…” 어떻게 분위기를 풀지 생각한다.",
      "“다른 방법 없나?” 새로운 해결 방법을 계속 생각한다.",
    ],
    descriptions: {
      "“왜지?” 뭐 때문에 막혔는지 원인부터 생각한다.": "핵심 파악 · 문제 해결",
      "“뭐가 더 낫지?” 각 의견의 장단점을 따져본다.": "판단력 · 현실 감각",
      "“둘 다 괜찮은데?” 서로의 의견을 합칠 방법을 생각한다.": "유연성 · 중재 능력",
      "“분위기 안 좋은데…” 어떻게 분위기를 풀지 생각한다.": "상황 감지 · 분위기 관리",
      "“다른 방법 없나?” 새로운 해결 방법을 계속 생각한다.": "끈기 · 대안 탐색",
    },
  },
  {
    id: 3,
    type: "ranked",
    question: "이 사람이 회의에서 가장 자주 하는 행동은?",
    resultTitle: "💬 나의 핵심 역할",
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
    type: "ranked",
    question:
      "팀플 도중 예상치 못한 문제가 생겼다. 이 사람은 가장 먼저 어떻게 할 것 같아?",
    resultTitle: "🛠️ 문제가 생겼을 때 대처 방식",
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
    type: "ranked",
    question: "팀플 마감 하루 전, 이 사람에게 가장 기대하게 되는 건?",
    resultTitle: "🔥 마감 직전의 나",
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
    type: "ranked",
    question: "다음 팀플에서도 이 사람과 함께하고 싶은 가장 큰 이유는?",
    resultTitle: "💎 나와 또 팀플하고 싶은 이유",
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
    type: "ranked",
    question:
      "이 사람을 한 단계 레벨업시킬 수 있다면, 어떤 능력치를 올려줄래?",
    resultTitle: "🌱 한 단계 더 성장할 역량",
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
    type: "single",
    question: "평소에 볼 때랑 팀플할 때, 이 사람은 어떻게 달라?",
    resultTitle: "👀 팀플에서 발견한 의외의 모습",
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

const COMPETENCIES: readonly Competency[] = [
  "문제해결력",
  "의사소통 능력",
  "협업 능력",
  "창의성",
  "분석적 사고",
  "논리적 사고",
  "실행력",
  "주도성",
  "책임감",
  "적응력",
  "학습 능력",
];

const COMPETENCY_DESCRIPTIONS: Record<Competency, string> = {
  문제해결력: "문제를 파악하고 해결 방법을 찾아내는 능력",
  "의사소통 능력":
    "생각과 정보를 명확하게 전달하고 상대의 의견을 이해하는 능력",
  "협업 능력": "구성원들과 역할을 조율하며 공동의 목표를 달성하는 능력",
  창의성: "새로운 아이디어나 기존과 다른 접근 방법을 제시하는 능력",
  "분석적 사고": "정보와 상황을 체계적으로 분석하여 의미를 도출하는 능력",
  "논리적 사고": "근거를 바탕으로 판단하고 생각을 구조화하는 능력",
  실행력: "계획이나 아이디어를 실제 행동과 결과로 연결하는 능력",
  주도성: "지시를 기다리기보다 필요한 일을 스스로 찾아 추진하는 능력",
  책임감: "맡은 역할을 끝까지 수행하고 결과에 책임지는 태도",
  적응력: "새로운 환경이나 예상치 못한 변화에 유연하게 대응하는 능력",
  "학습 능력": "새로운 지식과 기술을 빠르게 습득하고 실제 상황에 적용하는 능력",
};

// Q3~Q6의 선택지를 11개 핵심 역량으로 변환합니다.
const COMPETENCY_MAPPINGS: Partial<
  Record<number, Record<string, Competency>>
> = {
  3: {
    "아이디어를 낸다": "창의성",
    "필요한 정보나 모르는 부분을 바로 확인한다": "학습 능력",
    "여러 의견의 공통점과 차이를 정리한다": "분석적 사고",
    "현실적으로 가능한지 판단한다": "논리적 사고",
    "조용히 듣다가 핵심을 말한다": "논리적 사고",
  },
  4: {
    "필요한 일을 먼저 찾아서 움직인다": "주도성",
    "왜 문제가 생겼는지 원인부터 파악한다": "분석적 사고",
    "팀원들과 해결 방법을 같이 논의한다": "협업 능력",
    "기존 계획을 수정해서 새로운 방향을 잡는다": "적응력",
    "우선순위를 정해서 급한 것부터 처리한다": "실행력",
  },
  5: {
    "부족한 부분이 보이면 필요한 내용을 찾아 빠르게 보완한다": "학습 능력",
    "어떻게든 자기 몫은 끝낸다": "책임감",
    "진행 상황을 공유하며 다 같이 끝낼 수 있게 조율한다":
      "의사소통 능력",
    "필요한 수정사항을 바로 반영해 결과물을 완성한다": "실행력",
    "막힌 부분의 해결책을 가져온다": "문제해결력",
    "지친 팀 분위기를 살려준다": "협업 능력",
  },
  6: {
    "일을 믿고 맡길 수 있어서": "책임감",
    "좋은 아이디어를 내서": "창의성",
    "소통이 편해서": "의사소통 능력",
    "문제 해결을 잘해서": "문제해결력",
    "예상치 못한 상황에도 잘 대처해서": "적응력",
    "팀을 잘 이끌어서": "주도성",
  },
};

// 첨부된 기존 참여 페이지의 예전 문구를 최신 문구로 합쳐 집계합니다.
// 참여 페이지까지 최신 문구로 바꾸고 기존 응답 호환이 필요 없어지면 제거해도 됩니다.
const LEGACY_OPTION_ALIASES: Partial<Record<number, Record<string, string>>> = {
  1: {
    "아이디어부터 던진다": "주제나 새로운 아이디어를 먼저 제안한다.",
    "자료부터 찾아본다": "관련 사례와 자료를 먼저 조사한다.",
    "해야 할 일을 정리한다": "해야 할 일을 정리하고 역할을 나눈다.",
    "사람들 의견부터 듣는다": "팀원들의 의견과 선호를 먼저 물어본다.",
  },
  2: {
    "문제를 다시 정리한다": "“왜지?” 뭐 때문에 막혔는지 원인부터 생각한다.",
    "일단 하나를 결정하자고 한다": "“뭐가 더 낫지?” 각 의견의 장단점을 따져본다.",
    "다른 사람들의 의견을 정리한다": "“둘 다 괜찮은데?” 서로의 의견을 합칠 방법을 생각한다.",
    "새로운 아이디어를 던진다": "“다른 방법 없나?” 새로운 해결 방법을 계속 생각한다.",
  },
  3: {
    "질문을 많이 한다": "필요한 정보나 모르는 부분을 바로 확인한다",
    "다른 의견을 정리한다": "여러 의견의 공통점과 차이를 정리한다",
  },
  5: {
    "빠진 부분을 귀신같이 찾아낸다":
      "부족한 부분이 보이면 필요한 내용을 찾아 빠르게 보완한다",
    "다 같이 끝낼 수 있게 챙긴다":
      "진행 상황을 공유하며 다 같이 끝낼 수 있게 조율한다",
    "결과물을 한 단계 더 다듬는다":
      "필요한 수정사항을 바로 반영해 결과물을 완성한다",
  },
};

// 최신 선택지와 의미가 달라 합칠 수 없는 예전 문구는 원문으로 표시하면서
// 기존 데이터의 TOP 3 계산만 가능하도록 별도 역량을 연결합니다.
const LEGACY_COMPETENCY_MAPPINGS: Partial<
  Record<number, Record<string, Competency>>
> = {
  4: {
    "일단 해결할 방법부터 찾아본다": "문제해결력",
  },
  6: {
    "결과물의 완성도를 높여서": "실행력",
    "팀 분위기를 좋게 만들어서": "협업 능력",
  },
};

const MEDALS = ["🥇", "🥈", "🥉"] as const;

function normalizeChoice(questionNumber: number, choice: string | null) {
  if (!choice) return null;
  return LEGACY_OPTION_ALIASES[questionNumber]?.[choice] ?? choice;
}

function getCompetency(questionNumber: number, choice: string | null) {
  if (!choice) return null;

  const normalizedChoice = normalizeChoice(questionNumber, choice);

  return (
    (normalizedChoice
      ? COMPETENCY_MAPPINGS[questionNumber]?.[normalizedChoice]
      : undefined) ??
    LEGACY_COMPETENCY_MAPPINGS[questionNumber]?.[choice] ??
    null
  );
}

function getPercent(count: number, total: number) {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

export default function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 최신 Next.js App Router에서는 동적 params가 Promise로 전달됩니다.
  const { id } = use(params);
  const searchParams = useSearchParams();
  const resultKey = searchParams.get("key");

  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(
    new Set(),
  );
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // id와 result_key가 모두 일치하는 테스트만 조회합니다.
  useEffect(() => {
    let ignore = false;

    const loadResult = async () => {
      setLoading(true);
      setError("");
      setTest(null);
      setResponses([]);
      setAnswers([]);
      setExpandedQuestions(new Set());

      if (!UUID_PATTERN.test(id) || !resultKey || !UUID_PATTERN.test(resultKey)) {
        if (!ignore) {
          setError("invalid-link");
          setLoading(false);
        }
        return;
      }

      try {
        const { data: testData, error: testError } = await supabase
          .from("tests")
          .select("id, nickname, result_key")
          .eq("id", id)
          .eq("result_key", resultKey)
          .maybeSingle();

        if (testError) {
          console.error("결과 페이지 테스트 조회 오류:", testError);
          if (!ignore) setError("load-failed");
          return;
        }

        if (!testData) {
          if (!ignore) setError("invalid-link");
          return;
        }

        const verifiedTest = testData as Test;

        const { data: responseData, error: responseError } = await supabase
          .from("responses")
          .select("id, respondent_name, project_name, created_at")
          .eq("test_id", verifiedTest.id)
          .order("created_at", { ascending: true });

        if (responseError) {
          console.error("결과 페이지 responses 조회 오류:", responseError);
          if (!ignore) setError("load-failed");
          return;
        }

        const loadedResponses = (responseData ?? []) as ResponseRow[];
        let loadedAnswers: AnswerRow[] = [];

        if (loadedResponses.length > 0) {
          const responseIds = loadedResponses.map((response) => response.id);

          const { data: answerData, error: answerError } = await supabase
            .from("answers")
            .select(
              "response_id, question_number, first_choice, second_choice",
            )
            .in("response_id", responseIds);

          if (answerError) {
            console.error("결과 페이지 answers 조회 오류:", answerError);
            if (!ignore) setError("load-failed");
            return;
          }

          loadedAnswers = (answerData ?? []) as AnswerRow[];
        }

        if (!ignore) {
          setTest(verifiedTest);
          setResponses(loadedResponses);
          setAnswers(loadedAnswers);
        }
      } catch (caughtError) {
        console.error("결과 페이지 조회 중 예외 발생:", caughtError);
        if (!ignore) setError("load-failed");
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadResult();

    return () => {
      ignore = true;
    };
  }, [id, resultKey]);

  // Q3~Q6만 사용해 핵심 역량 점수를 계산합니다.
  const competencyScores = useMemo<CompetencyScore[]>(() => {
    const scoreMap = new Map<Competency, CompetencyScore>(
      COMPETENCIES.map((competency) => [
        competency,
        {
          competency,
          totalScore: 0,
          q3Score: 0,
          q6Score: 0,
          firstChoiceCount: 0,
        },
      ]),
    );

    answers.forEach((answer) => {
      if (answer.question_number < 3 || answer.question_number > 6) return;

      const addScore = (choice: string | null, weight: number) => {
        const competency = getCompetency(answer.question_number, choice);
        if (!competency) return;

        const score = scoreMap.get(competency);
        if (!score) return;

        score.totalScore += weight;
        if (answer.question_number === 3) score.q3Score += weight;
        if (answer.question_number === 6) score.q6Score += weight;
        if (weight === 2) score.firstChoiceCount += 1;
      };

      addScore(answer.first_choice, 2);
      addScore(answer.second_choice, 1);
    });

    return COMPETENCIES.map((competency) => scoreMap.get(competency)!).sort(
      (a, b) => {
        // 동점일 때만 Q3 → Q6 → 1순위 횟수 → 기존 배열 순서를 적용합니다.
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (b.q3Score !== a.q3Score) return b.q3Score - a.q3Score;
        if (b.q6Score !== a.q6Score) return b.q6Score - a.q6Score;
        if (b.firstChoiceCount !== a.firstChoiceCount) {
          return b.firstChoiceCount - a.firstChoiceCount;
        }
        return (
          COMPETENCIES.indexOf(a.competency) -
          COMPETENCIES.indexOf(b.competency)
        );
      },
    );
  }, [answers]);

  const topStrengths = useMemo(
    () => competencyScores.filter((score) => score.totalScore > 0).slice(0, 3),
    [competencyScores],
  );

  // 성장 포인트는 Q7만 사용하고, 1순위 2점 / 2순위 1점을 적용합니다.
  // 최고 점수가 동점이면 해당 항목을 모두 공동 1위로 표시합니다.
  const growthPoints = useMemo(() => {
    const question = QUESTIONS.find((item) => item.id === 7);
    if (!question) return [];

    const scores = question.options.map((option, originalIndex) => ({
      option,
      originalIndex,
      totalScore: 0,
      firstChoiceCount: 0,
    }));

    const scoreMap = new Map(scores.map((score) => [score.option, score]));

    answers
      .filter((answer) => answer.question_number === 7)
      .forEach((answer) => {
        const firstChoice = normalizeChoice(7, answer.first_choice);
        const secondChoice = normalizeChoice(7, answer.second_choice);

        if (firstChoice && scoreMap.has(firstChoice)) {
          const score = scoreMap.get(firstChoice)!;
          score.totalScore += 2;
          score.firstChoiceCount += 1;
        }

        if (secondChoice && scoreMap.has(secondChoice)) {
          scoreMap.get(secondChoice)!.totalScore += 1;
        }
      });

    scores.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.firstChoiceCount !== a.firstChoiceCount) {
        return b.firstChoiceCount - a.firstChoiceCount;
      }
      return a.originalIndex - b.originalIndex;
    });

    const highestScore = scores[0]?.totalScore ?? 0;
    if (highestScore <= 0) return [];

    return scores.filter((score) => score.totalScore === highestScore);
  }, [answers]);

  // 질문별 실제 선택 수와 비율을 계산합니다.
  const questionStats = useMemo<QuestionStat[]>(() => {
    const responseCount = responses.length;

    return QUESTIONS.map((question) => {
      const questionAnswers = answers.filter(
        (answer) => answer.question_number === question.id,
      );

      // 예전 데이터 중 최신 선택지와 합칠 수 없는 문구도 누락 없이 보여줍니다.
      const extraOptions: string[] = [];
      questionAnswers.forEach((answer) => {
        [answer.first_choice, answer.second_choice].forEach((choice) => {
          const normalizedChoice = normalizeChoice(question.id, choice);
          if (
            normalizedChoice &&
            !question.options.includes(normalizedChoice) &&
            !extraOptions.includes(normalizedChoice)
          ) {
            extraOptions.push(normalizedChoice);
          }
        });
      });

      const displayOptions = [...question.options, ...extraOptions];

      const optionStats = displayOptions.map((option, originalIndex) => {
        const firstCount = questionAnswers.filter(
          (answer) =>
            normalizeChoice(question.id, answer.first_choice) === option,
        ).length;
        const secondCount =
          question.type === "ranked"
            ? questionAnswers.filter(
                (answer) =>
                  normalizeChoice(question.id, answer.second_choice) === option,
              ).length
            : 0;

        return {
          option,
          originalIndex,
          firstCount,
          firstPercent: getPercent(firstCount, responseCount),
          secondCount,
          secondPercent: getPercent(secondCount, responseCount),
          weightedScore:
            question.type === "ranked"
              ? firstCount * 2 + secondCount
              : firstCount,
        };
      });

      optionStats.sort((a, b) => {
        if (b.weightedScore !== a.weightedScore) {
          return b.weightedScore - a.weightedScore;
        }
        if (b.firstCount !== a.firstCount) return b.firstCount - a.firstCount;
        if (b.secondCount !== a.secondCount) {
          return b.secondCount - a.secondCount;
        }
        return a.originalIndex - b.originalIndex;
      });

      return {
        question,
        options: optionStats.map(
          (stat): OptionStat => ({
            option: stat.option,
            firstCount: stat.firstCount,
            firstPercent: stat.firstPercent,
            secondCount: stat.secondCount,
            secondPercent: stat.secondPercent,
            weightedScore: stat.weightedScore,
          }),
        ),
      };
    });
  }, [answers, responses.length]);

  const shareUrl = origin && test ? `${origin}/test/${test.id}` : "";

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setCopyError("");

      window.setTimeout(() => setCopied(false), 2000);
    } catch (caughtError) {
      console.error("설문 링크 복사 오류:", caughtError);
      setCopied(false);
      setCopyError("링크를 복사하지 못했어요. 주소를 직접 복사해주세요.");
    }
  };

  const toggleQuestion = (questionId: number) => {
    setExpandedQuestions((previous) => {
      const next = new Set(previous);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  if (loading) {
    return (
      <PageShell>
        <div className="py-20 text-center" aria-live="polite">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
          <p className="font-medium text-slate-600">
            결과를 불러오고 있어요...
          </p>
        </div>
      </PageShell>
    );
  }

  if (error || !test) {
    return (
      <PageShell>
        <div className="rounded-3xl bg-white px-6 py-14 text-center shadow-sm sm:px-10">
          <div className="mb-4 text-5xl">🔒</div>
          <h1 className="text-2xl font-bold text-slate-900">
            결과 페이지에 접근할 수 없어요.
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base">
            결과 확인 링크가 잘못되었거나
            <br />
            유효하지 않은 링크일 수 있어요.
          </p>
        </div>
      </PageShell>
    );
  }

  const responseCount = responses.length;

  return (
    <PageShell>
      {/* 프로필 */}
      <section className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-100 sm:p-8">
        <div className="text-4xl">👤</div>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          {test.nickname}의 팀플 결과
        </h1>
        <p className="mt-2 text-sm leading-6 text-indigo-100 sm:text-base">
          {responseCount}명의 팀원이 답했어요.
        </p>
      </section>

      {responses.length === 0 ? (
        <EmptyResults
          shareUrl={shareUrl}
          copied={copied}
          copyError={copyError}
          onCopy={handleCopyShareLink}
        />
      ) : (
        <>
          {/* 응답자들 */}
          <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                응답자들
              </h2>
              <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">
                {responseCount}명
              </span>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {responses.map((response) => {
                const respondentName = response.respondent_name?.trim() || "익명";
                const projectName = response.project_name?.trim() || "없음";

                return (
                  <div
                    key={response.id}
                    className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">
                        {respondentName}
                      </p>
                      <p className="mt-1 break-words text-sm leading-5 text-slate-500">
                        {projectName}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 핵심 강점 TOP 3 */}
          <section className="mt-5 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              💎 나의 핵심 강점 TOP 3
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              팀원들이 프로젝트에서 자주 발견한 강점이에요.
            </p>

            {topStrengths.length > 0 ? (
              <div className="mt-6 space-y-3">
                {topStrengths.map((strength, index) => (
                  <div
                    key={strength.competency}
                    className={`rounded-2xl border p-4 sm:p-5 ${
                      index === 0
                        ? "border-indigo-200 bg-indigo-50/70"
                        : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl" aria-hidden="true">
                        {MEDALS[index]}
                      </span>
                      <div>
                        <h3 className="font-bold text-slate-900 sm:text-lg">
                          {strength.competency}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {COMPETENCY_DESCRIPTIONS[strength.competency]}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                핵심 강점을 계산할 수 있는 답변이 아직 부족해요.
              </p>
            )}
          </section>

          {/* 성장 포인트 */}
          <section className="mt-5 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              🌱 나의 성장 포인트
            </h2>

            {growthPoints.length > 0 ? (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {growthPoints.map((growthPoint) => (
                    <div
                      key={growthPoint.option}
                      className="rounded-2xl border border-emerald-100 bg-white/70 px-4 py-4"
                    >
                      {growthPoints.length > 1 && (
                        <p className="mb-1 text-xs font-bold text-emerald-600">
                          공동 1위
                        </p>
                      )}
                      <p className="text-2xl font-black text-emerald-700 sm:text-3xl">
                        {growthPoint.option}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                  {growthPoints.length > 1
                    ? "팀원들이 공동으로 가장 많이 선택한 성장 역량들이에요."
                    : "팀원들이 가장 많이 선택한 성장 역량이에요."}
                  <br />
                  조금 더 키우면 한 단계 더 성장할 수 있어요.
                </p>
              </>
            ) : (
              <p className="mt-5 text-sm text-slate-500">
                성장 포인트를 계산할 수 있는 답변이 아직 부족해요.
              </p>
            )}
          </section>

          {/* 상세 결과 */}
          <section className="mt-10">
            <div className="px-1">
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                🔍 조금 더 자세히 볼까요?
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                질문마다 팀원들이 실제로 선택한 비율을 확인해보세요.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {questionStats.map((stat) => (
                <ResultCard
                  key={stat.question.id}
                  stat={stat}
                  expanded={expandedQuestions.has(stat.question.id)}
                  onToggle={() => toggleQuestion(stat.question.id)}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </PageShell>
  );
}

function ResultCard({
  stat,
  expanded,
  onToggle,
}: {
  stat: QuestionStat;
  expanded: boolean;
  onToggle: () => void;
}) {
  const topOption = stat.options[0];
  const hasAnswer = topOption && topOption.weightedScore > 0;
  const visibleOptions = expanded ? stat.options : stat.options.slice(0, 1);

  return (
    <article className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
      <div>
        <p className="text-xs font-semibold text-indigo-500">
          QUESTION {stat.question.id}
        </p>
        <h3 className="mt-2 text-lg font-bold text-slate-900 sm:text-xl">
          {stat.question.resultTitle}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {stat.question.question}
        </p>
      </div>

      {hasAnswer ? (
        <div className={`mt-6 ${expanded ? "space-y-6" : ""}`}>
          {visibleOptions.map((optionStat, index) => (
            <div
              key={optionStat.option}
              className={
                expanded && index > 0
                  ? "border-t border-slate-100 pt-6"
                  : ""
              }
            >
              <p className="font-bold leading-6 text-slate-800">
                {optionStat.option}
              </p>

              {stat.question.descriptions?.[optionStat.option] && (
                <p className="mt-1 text-xs font-medium leading-5 text-slate-400">
                  {stat.question.descriptions[optionStat.option]}
                </p>
              )}

              {stat.question.type === "single" ? (
                <SingleStat stat={optionStat} />
              ) : (
                <RankedStat stat={optionStat} />
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
          이 질문에 집계할 수 있는 응답이 없어요.
        </p>
      )}

      {hasAnswer && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="mt-6 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
        >
          {expanded ? "결과 접기" : "전체 결과 보기"}
        </button>
      )}
    </article>
  );
}

function SingleStat({ stat }: { stat: OptionStat }) {
  return (
    <div className="mt-3">
      <p className="text-sm font-semibold text-indigo-600">
        {stat.firstPercent}% · {stat.firstCount}명
      </p>
      <ProgressBar percent={stat.firstPercent} color="bg-indigo-500" />
    </div>
  );
}

function RankedStat({ stat }: { stat: OptionStat }) {
  return (
    <div className="mt-4 space-y-4">
      <div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold text-indigo-600">1순위</span>
          <span className="text-slate-500">
            {stat.firstPercent}% · {stat.firstCount}명
          </span>
        </div>
        <ProgressBar percent={stat.firstPercent} color="bg-indigo-500" />
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold text-violet-600">2순위</span>
          <span className="text-slate-500">
            {stat.secondPercent}% · {stat.secondCount}명
          </span>
        </div>
        <ProgressBar percent={stat.secondPercent} color="bg-violet-400" />
      </div>
    </div>
  );
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

function EmptyResults({
  shareUrl,
  copied,
  copyError,
  onCopy,
}: {
  shareUrl: string;
  copied: boolean;
  copyError: string;
  onCopy: () => void;
}) {
  return (
    <section className="mt-5 rounded-3xl bg-white px-6 py-10 text-center shadow-sm sm:px-10 sm:py-12">
      <div className="text-5xl">👀</div>
      <h2 className="mt-4 text-2xl font-bold text-slate-900">
        아직 받은 응답이 없어요.
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
        팀원들에게 설문 링크를 공유해보세요.
        <br />
        응답이 들어오면 이곳에서 결과를 확인할 수 있어요.
      </p>

      {shareUrl && (
        <div className="mt-7">
          <div className="rounded-xl bg-slate-50 p-4 text-left">
            <p className="break-all text-sm leading-6 text-slate-600">
              {shareUrl}
            </p>
          </div>
          <button
            type="button"
            onClick={onCopy}
            className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-3.5 font-semibold text-white transition hover:bg-indigo-700"
          >
            {copied ? "✓ 복사했어요!" : "설문 링크 복사"}
          </button>
        </div>
      )}

      {copyError && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {copyError}
        </p>
      )}
    </section>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-[100dvh] bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">{children}</div>
    </main>
  );
}