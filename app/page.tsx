"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RecentTest = {
  id: string;
  nickname: string;
  result_key: string;
  created_at: string;
};

const RECENT_TESTS_KEY = "recentTests";
const MAX_RECENT_TESTS = 5;

// localStorage 데이터가 올바른 형태인지 확인
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

// 2026.09.28 형식으로 날짜 변환
const formatCreatedDate = (createdAt: string) => {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
};

export default function Home() {
  const [recentTests, setRecentTests] = useState<RecentTest[]>([]);
  const [copiedTestId, setCopiedTestId] = useState<string | null>(null);

  // 메인 페이지 접속 시 최근 만든 테스트 불러오기
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedValue = window.localStorage.getItem(RECENT_TESTS_KEY);

      // 저장된 데이터가 없으면 빈 배열
      if (!storedValue) {
        setRecentTests([]);
        return;
      }

      let parsedValue: unknown;

      try {
        parsedValue = JSON.parse(storedValue);
      } catch (parseError) {
        console.error("최근 테스트 목록 JSON 파싱 오류:", parseError);
        setRecentTests([]);
        return;
      }

      // 배열이 아니면 잘못된 데이터로 판단
      if (!Array.isArray(parsedValue)) {
        setRecentTests([]);
        return;
      }

      // 올바른 데이터만 사용하고 최대 5개까지만 표시
      const validTests = parsedValue
        .filter(isRecentTest)
        .slice(0, MAX_RECENT_TESTS);

      setRecentTests(validTests);
    } catch (storageError) {
      console.error("최근 테스트 목록 불러오기 오류:", storageError);
      setRecentTests([]);
    }
  }, []);

  // 설문 링크 복사
  const handleCopyShareLink = async (test: RecentTest) => {
    if (typeof window === "undefined") {
      return;
    }

    const shareUrl = `${window.location.origin}/test/${test.id}`;

    try {
      await navigator.clipboard.writeText(shareUrl);

      setCopiedTestId(test.id);

      window.setTimeout(() => {
        setCopiedTestId((currentId) =>
          currentId === test.id ? null : currentId
        );
      }, 2000);
    } catch (error) {
      console.error("설문 링크 복사 오류:", error);
    }
  };

  // 최근 목록에서만 삭제
  const handleDeleteRecentTest = (testId: string) => {
    const nextTests = recentTests.filter((test) => test.id !== testId);

    // 화면에서는 즉시 제거
    setRecentTests(nextTests);

    if (typeof window === "undefined") {
      return;
    }

    try {
      if (nextTests.length === 0) {
        window.localStorage.removeItem(RECENT_TESTS_KEY);
      } else {
        window.localStorage.setItem(
          RECENT_TESTS_KEY,
          JSON.stringify(nextTests)
        );
      }
    } catch (storageError) {
      console.error("최근 테스트 삭제 오류:", storageError);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      {/* 배경 장식 */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-100/50 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* 기존 메인 카드 */}
        <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.06)] sm:p-8">
          <div className="text-center">
            {/* 상단 아이콘 */}
            <div className="mb-6 flex justify-center">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50">
                <span className="absolute -left-4 top-2 text-sm text-indigo-300">
                  ✦
                </span>

                <span className="absolute -right-5 bottom-3 text-xs text-violet-300">
                  ✦
                </span>

                <span className="text-4xl" aria-hidden="true">
                  👥
                </span>
              </div>
            </div>

            {/* 제목 */}
            <h1 className="text-[28px] font-bold leading-[1.25] tracking-tight text-slate-900 sm:text-3xl">
              팀플할 때 나는
              <br />
              어떤 사람일까?
            </h1>

            {/* 설명 */}
            <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base">
              함께했던 사람들에게 물어보세요.
            </p>
          </div>

          {/* 시작 버튼 */}
          <Link
            href="/create"
            className="mt-8 flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-4 py-4 font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md active:translate-y-0"
          >
            <span className="flex items-center justify-center gap-2">
              내 테스트 만들기
              <span aria-hidden="true">→</span>
            </span>
          </Link>

          {/* 안내 */}
          <div className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-400">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-xs"
              aria-hidden="true"
            >
              🔗
            </span>

            <span>팀원들은 로그인 없이 참여할 수 있어요</span>
          </div>
        </div>

        {/* 최근 만든 테스트 */}
        {recentTests.length > 0 && (
          <section className="mt-7">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-slate-700">
                최근 만든 테스트
              </h2>

              <span className="text-xs text-slate-400">
                최대 {MAX_RECENT_TESTS}개
              </span>
            </div>

            <div className="space-y-3">
              {recentTests.map((test) => {
                const resultUrl = `/result/${test.id}?key=${encodeURIComponent(
                  test.result_key
                )}`;

                const isCopied = copiedTestId === test.id;

                return (
                  <article
                    key={test.id}
                    className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)]"
                  >
                    <div>
                      <p className="truncate font-semibold text-slate-800">
                        {test.nickname}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {formatCreatedDate(test.created_at)}
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {/* 설문 링크 복사 */}
                      <button
                        type="button"
                        onClick={() => handleCopyShareLink(test)}
                        className="rounded-xl bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                      >
                        {isCopied ? "✓ 복사했어요!" : "설문 링크 복사"}
                      </button>

                      {/* 결과 보기 */}
                      <Link
                        href={resultUrl}
                        className="flex items-center justify-center rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                      >
                        내 결과 보기
                      </Link>
                    </div>

                    {/* localStorage 목록에서만 제거 */}
                    <div className="mt-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteRecentTest(test.id)}
                        className="text-xs font-medium text-slate-400 transition hover:text-slate-600"
                      >
                        목록에서 삭제
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <p className="mt-5 text-center text-xs text-slate-400">
          팀원들과 함께한 나의 모습을 확인해보세요.
        </p>
      </div>
    </main>
  );
}