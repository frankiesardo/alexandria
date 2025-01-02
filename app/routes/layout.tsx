import { Link, Outlet } from "react-router";

export default function Layout() {
  return (
    <div className="flex flex-col max-w-2xl mx-auto h-[100dvh] bg-gray-50">
      <header className="bg-blue-600 text-white p-4">
        <Link to="/">
          <h1 className="text-lg font-bold">ALEXANDRIA</h1>
        </Link>
      </header>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}