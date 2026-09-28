"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type CreatedTest = {
  id: string;
  nickname: string;
  result_key: string;
  created_at: string;
};

type RecentTest = {
  id: string;
  nickname: string;
  result_key: string;
  created_at: string;
};

const RECENT_TESTS_KEY = "recentTests";
const MAX_RECENT_TESTS = 5;

// localStorage에 저장된 값이 올바른 RecentTest 형태인지 확인
const isRecentTest = (value: unknown): value is RecentTest => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const test = value as Partial<RecentTest>;

  return (
    typeof test.id === "string" &&
    test.id.length > 0 &&
    typeof test.nickname === "string" &&
    typeof test.result_key === "string" &&
    test.result_key.length > 0 &&
    typeof test.created_at === "string" &&
    test.created_at.length > 0 &&
    !Number.isNaN(Date.parse(test.created_at))
  );
};

// 최근 만든 테스트를 localStorage에 저장
const saveRecentTest = (test: RecentTest) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const storedValue = window.localStorage.getItem(RECENT_TESTS_KEY);

    let previousTests: RecentTest[] = [];

    if (storedValue) {
      try {
        const parsedValue: unknown = JSON.parse(storedValue);

        if (Array.isArray(parsedValue)) {
          previousTests = parsedValue.filter(isRecentTest);
        }
      } catch (parseError) {
        console.error("최근 테스트 목록 파싱 오류:", parseError);
        previousTests = [];
      }
    }

    // 같은 id가 있다면 기존 항목을 제거한 뒤
    // 새 테스트를 배열 맨 앞에 추가
    const testsWithoutDuplicate = previousTests.filter(
      (recentTest) => recentTest.id !== test.id
    );

    const nextTests = [test, ...testsWithoutDuplicate].slice(
      0,
      MAX_RECENT_TESTS
    );

    window.localStorage.setItem(
      RECENT_TESTS_KEY,
      JSON.stringify(nextTests)
    );
  } catch (storageError) {
    // localStorage 저장 실패가 테스트 생성 실패로 이어지지 않도록 처리
    console.error("최근 테스트 저장 오류:", storageError);
  }
};

export default function CreatePage() {
  const router = useRouter();

  // 사용자가 입력하는 이름
  const [nickname, setNickname] = useState("");

  // 테스트 생성 중인지 확인
  const [loading, setLoading] = useState(false);

  // 오류 메시지
  const [error, setError] = useState("");

  // 생성된 테스트 정보
  const [createdTest, setCreatedTest] = useState<CreatedTest | null>(null);

  // 링크 복사 여부
  const [copied, setCopied] = useState(false);

  // 테스트 생성
  const handleCreateTest = async () => {
    const trimmedNickname = nickname.trim();

    setError("");

    // 이름이 비어 있는 경우
    if (!trimmedNickname) {
      setError("이름을 입력해주세요.");
      return;
    }

    // 이름이 20자를 초과한 경우
    if (trimmedNickname.length > 20) {
      setError("이름은 20자 이하로 입력해주세요.");
      return;
    }

    try {
      setLoading(true);

      // tests 테이블에 nickname만 저장
      // id, result_key, created_at은 Supabase에서 자동 생성
      const { data, error: insertError } = await supabase
        .from("tests")
        .insert({
          nickname: trimmedNickname,
        })
        .select("id, nickname, result_key, created_at")
        .single();

      if (insertError) {
        console.error(insertError);
        setError("테스트를 만드는 중 문제가 발생했어요. 다시 시도해주세요.");
        return;
      }

      if (!data) {
        setError("테스트 정보를 불러오지 못했어요. 다시 시도해주세요.");
        return;
      }

      const newTest = data as CreatedTest;

      // 기존 생성 완료 처리
      setCreatedTest(newTest);

      // 최근 만든 테스트에 저장
      // 저장에 실패해도 Supabase 테스트 생성에는 영향을 주지 않음
      saveRecentTest(newTest);
    } catch (error) {
      console.error(error);
      setError("잠시 문제가 발생했어요. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  // 팀원들에게 공유하는 설문 링크
  const shareUrl = createdTest
    ? `${origin}/test/${createdTest.id}`
    : "";

  // 생성자만 사용하는 결과 확인 링크
  const resultUrl = createdTest
    ? `${origin}/result/${createdTest.id}?key=${encodeURIComponent(
        createdTest.result_key
      )}`
    : "";

  // 설문 링크 복사
  const handleCopy = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(error);
      setError("링크를 복사하지 못했어요. 직접 복사해주세요.");
    }
  };

  // 결과 페이지 이동
  const handleGoToResult = () => {
    if (!createdTest) return;

    router.push(
      `/result/${createdTest.id}?key=${encodeURIComponent(
        createdTest.result_key
      )}`
    );
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      {/* 배경 장식 */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-100/50 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.06)] sm:p-8">
          {/* 테스트 생성 전 */}
          {!createdTest && (
            <>
              <div className="mb-8 text-center">
                <div className="mb-5 flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">
                    ✏️
                  </div>
                </div>

                <h1 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
                  어떤 이름으로
                  <br />
                  테스트를 만들까요?
                </h1>

                <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base">
                  친구들이 알아볼 수 있는
                  <br />
                  이름이나 닉네임을 입력해주세요.
                </p>
              </div>

              {/* 이름 입력 */}
              <div className="mb-6">
                <label
                  htmlFor="nickname"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  평가받을 이름
                </label>

                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  maxLength={20}
                  disabled={loading}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) {
                      handleCreateTest();
                    }
                  }}
                  placeholder="이름 또는 닉네임을 입력하세요"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                />

                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    함께한 팀원들에게 보여질 이름이에요.
                  </p>

                  <span className="text-xs text-slate-400">
                    {nickname.length}/20
                  </span>
                </div>

                {/* 오류 */}
                {error && (
                  <div className="mt-3 rounded-lg bg-red-50 px-3 py-2">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
              </div>

              {/* 생성 버튼 */}
              <button
                type="button"
                onClick={handleCreateTest}
                disabled={loading}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {loading ? "테스트를 만들고 있어요..." : "테스트 만들기"}
              </button>

              {/* 메인으로 돌아가기 */}
              <button
                type="button"
                disabled={loading}
                onClick={() => router.push("/")}
                className="mt-3 w-full py-2 text-sm font-medium text-slate-400 transition hover:text-slate-600 disabled:cursor-not-allowed"
              >
                ← 이전으로
              </button>
            </>
          )}

          {/* 테스트 생성 완료 */}
          {createdTest && (
            <>
              <div className="text-center">
                <div className="mb-3 text-5xl">🎉</div>

                <h1 className="text-2xl font-bold text-slate-900">
                  테스트가 만들어졌어요!
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  함께한 팀원들에게
                  <br />
                  아래 링크를 공유해보세요.
                </p>
              </div>

              {/* 공유 링크 */}
              <div className="mt-8">
                <p className="mb-2 text-sm font-semibold text-slate-700">
                  설문 참여 링크
                </p>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="break-all text-sm leading-6 text-slate-600">
                    {shareUrl}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700"
                >
                  {copied ? "✓ 복사했어요!" : "링크 복사"}
                </button>
              </div>

              {/* 결과 확인 */}
              <div className="mt-8 border-t border-slate-100 pt-7">
                <div className="rounded-2xl bg-amber-50 p-5">
                  <h2 className="text-lg font-bold text-slate-900">
                    내 결과 확인
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    팀원들의 응답이 쌓이면 여기에서 결과를 확인할 수 있어요.
                  </p>

                  <button
                    type="button"
                    onClick={handleGoToResult}
                    className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800"
                  >
                    결과 보러가기
                  </button>

                  <div className="mt-4 rounded-xl bg-white/70 p-3">
                    <p className="text-xs leading-5 text-amber-800">
                      🔒 결과 확인 링크는 본인만 보관해주세요.
                      <br />
                      로그인 기능이 없기 때문에 링크를 잃어버리면 다시 찾기
                      어려울 수 있어요.
                    </p>
                  </div>
                </div>
              </div>

              {/* 개발 중 확인용 resultUrl */}
              <p className="mt-4 break-all text-center text-[11px] text-slate-300">
                {resultUrl}
              </p>
            </>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          팀원들과 함께한 나의 모습을 확인해보세요.
        </p>
      </div>
    </main>
  );
}