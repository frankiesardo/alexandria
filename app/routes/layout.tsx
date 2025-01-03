import { Link, Outlet } from "react-router";
import favicon from "/favicon.ico?url" 

export default function Layout() {
  return (
    <div className="flex flex-col max-w-2xl mx-auto h-[100dvh] bg-gray-50">
      <Link to="/">
        <header className="bg-blue-600 text-white p-4 flex items-center space-x-4">     
          <img src={favicon} className="h-8 w-8" alt="App Logo" />
          <span className="text-xl font-bold flex items-center">Alexandria</span>          
        </header>
      </Link>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}