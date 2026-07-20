import { Outlet } from "react-router-dom";
import { Header } from "./Header";

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col h-full">
      <Header />
      <main className="mx-auto px-4 py-4 flex flex-col w-full">
        <Outlet />
      </main>
    </div>
  );
}
