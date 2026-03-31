export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16">
      <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900">
        런넥트 (Lunch Connect)
      </h1>
      <p className="mt-4 text-pretty text-slate-600">
        슬랙에서 <span className="font-medium text-slate-800">/점심</span> 명령어로
        점심 매칭을 시작할 수 있어요.
      </p>
      <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div className="text-sm font-medium text-slate-900">API 엔드포인트</div>
        <code className="mt-2 block rounded-md bg-white px-3 py-2 text-sm text-slate-800">
          POST /api/lunch
        </code>
      </div>
    </main>
  );
}

