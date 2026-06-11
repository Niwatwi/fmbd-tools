/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  LayoutGrid,
  Barcode,
  TrendingUp,
  User,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("th-TH"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    if (!storedName) {
      router.push("/login");
      return;
    }
    setDisplayName(storedName);
    setIsReady(true);
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  if (!isReady) return null;

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-sans text-slate-800">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
      />

      {/* HEADER: โลโก้, ชื่อบริษัท, ปุ่ม Logout */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 py-3 px-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          {/* Logo & Company Name */}
          <div className="flex items-center gap-2">
            <img src="/rvp.png" alt="RVP Logo" className="h-8 w-auto" />
            <div>
              <h1 className="text-slate-900 text-[9px] sm:text-[11px] font-black tracking-wide leading-tight">
                Riverpro Intertrade Co., Ltd.
              </h1>
              <p className="text-blue-600 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest leading-tight">
                FMBD Central Hub
              </p>
            </div>
          </div>

          {/* Right Section: Time, Refresh, Logout */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight hidden sm:block">
                Time
              </p>
              <p className="text-[10px] sm:text-xs font-mono font-bold text-slate-700">
                {currentTime}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="p-2 bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition-all"
            >
              <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all"
              title="ออกจากระบบ"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* BANNER */}
        <div className="bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 rounded-[2rem] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xl sm:text-2xl font-black mb-1">
              สวัสดีครับ, คุณ{displayName}! 👋
            </h2>
            <p className="text-blue-100 text-[10px] sm:text-xs font-medium">
              ระบบปฏิบัติการหน้าร้าน พร้อมใช้งานแล้วครับ
            </p>
          </div>
        </div>

        {/* STATUS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: User,
              label: "สถานะการลงเวลา",
              val: "ระบบพร้อมทำงาน",
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              icon: LayoutGrid,
              label: "อัปเดตข้อมูล",
              val: "ฐานข้อมูลออนไลน์",
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              icon: CheckCircle2,
              label: "งานที่รอดำเนินการ",
              val: "ตรวจสอบ Call Visit",
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl p-5 flex items-center gap-4 shadow-sm border border-slate-100"
            >
              <div
                className={`w-10 h-10 ${item.bg} ${item.color} rounded-2xl flex items-center justify-center`}
              >
                <item.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase">
                  {item.label}
                </p>
                <p className="text-xs font-black text-slate-800">{item.val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* APPS GRID */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-blue-600" /> ระบบปฏิบัติการ
            (Store Apps)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                title: "ลงเวลาเข้า-ออก",
                icon: User,
                color: "bg-blue-500",
                path: "/checkin",
              },
              {
                title: "จัดการสินค้า",
                icon: Barcode,
                color: "bg-emerald-500",
                path: "https://rvi-market-intelligence.vercel.app/",
              },
              {
                title: "War Room (OOS)",
                icon: TrendingUp,
                color: "bg-purple-500",
                path: "/auditor",
              },
            ].map((app, i) => (
              <div
                key={i}
                onClick={() =>
                  app.path.startsWith("http")
                    ? window.open(app.path, "_blank")
                    : router.push(app.path)
                }
                className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:border-blue-300 hover:shadow-xl transition-all cursor-pointer group h-40 flex flex-col justify-between"
              >
                <div
                  className={`w-12 h-12 ${app.color} text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}
                >
                  <app.icon className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-black text-slate-800">
                  {app.title}
                </h4>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="mt-12 bg-slate-900 text-white py-10 px-6 rounded-t-[3rem] shadow-2xl">
        <div className="max-w-md mx-auto text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4">
            by FMBD CONTROLLER
          </p>
          <div className="space-y-1 mb-6">
            <p className="text-lg font-black">Niwat Wiyasing</p>
            <p className="text-xs text-slate-400 font-medium">
              Niwat_wiy@riverpro.co.th
            </p>
            <div className="flex justify-center gap-4 text-xs font-bold mt-2 text-slate-300">
              <span className="flex items-center gap-2">
                <i className="fa-brands fa-line text-green-400"></i> niwatwi
              </span>
              <span className="flex items-center gap-1">
                <i className="fa-solid fa-phone text-blue-400"></i> 065-806-4694
              </span>
            </div>
          </div>
          <p className="text-[9px] opacity-40 mt-8">
            © 2026 Riverpro Intertrade Co., Ltd.
          </p>
        </div>
      </footer>
    </div>
  );
}
