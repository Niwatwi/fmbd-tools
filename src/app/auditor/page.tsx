/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function AuditorPage() {
  const router = useRouter();
  const [auditorCode, setAuditorCode] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [fetchingData, setFetchingData] = useState<boolean>(true);
  const [myRecentVisits, setMyRecentVisits] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState<string>("");

  const fetchDashboardData = useCallback(async (code: string) => {
    setFetchingData(true);
    const { data, error } = await supabase
      .from("store_visits")
      .select("*")
      .eq("auditor", code)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!error && data) setMyRecentVisits(data);
    setFetchingData(false);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("th-TH"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const code = localStorage.getItem("userCode");
    const name = localStorage.getItem("userName") || "พนักงาน";
    if (!code) {
      router.push("/login");
    } else {
      setAuditorCode(code);
      setDisplayName(name);
      fetchDashboardData(code);
    }
  }, [router, fetchDashboardData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-zinc-600 to-black font-sans antialiased pb-10">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
      />

      {/* HEADER: Gradient Glass + Logo Section */}
      <div className="bg-gradient-to-b from-indigo-950/60 to-zinc-900/60 backdrop-blur-2xl border-b border-white/10 p-6 pt-10 rounded-b-[2.5rem] shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <img src="/rvp.png" alt="RVP Logo" className="h-10 w-auto" />
          <div>
            <h1 className="text-white text-xs font-black tracking-wide">
              Riverpro Intertrade Co., Ltd.
            </h1>
            <p className="text-blue-400 text-[9px] font-bold uppercase tracking-widest">
              Auditor Hub
            </p>
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div>
            {/* ปุ่มกลับหน้าหลัก */}
            <button
              onClick={() => router.push("/")}
              className="mb-3 flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 hover:text-blue-400 transition-all bg-zinc-800/50 px-3 py-1 rounded-lg border border-white/5"
            >
              <i className="fa-solid fa-home"></i> กลับหน้าหลัก
            </button>
            <p className="text-white text-lg font-black drop-shadow-lg">
              {displayName}
            </p>
            <p className="text-zinc-500 text-[10px] font-bold">
              ID: {auditorCode}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xl font-mono font-black text-white drop-shadow-md">
              {currentTime}
            </div>
            <button
              onClick={() => fetchDashboardData(auditorCode)}
              className="mt-1 text-zinc-400 hover:text-white transition-all active:rotate-180"
            >
              <i className="fa-solid fa-rotate-right"></i>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6 space-y-6">
        {/* HERO CARD */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 shadow-[0_10px_25px_-5px_rgba(37,99,235,0.4)] border border-white/10">
          <h3 className="text-white font-black text-sm mb-1">
            บันทึกรายงานใหม่
          </h3>
          <p className="text-blue-100 text-[10px] mb-4 font-medium">
            เริ่มต้นบันทึกข้อมูลหน้างานวันนี้
          </p>
          <button
            onClick={() => router.push("/input")}
            className="w-full py-4 bg-white text-indigo-700 font-black text-xs rounded-2xl shadow-xl active:scale-[0.98] transition-all"
          >
            เปิดฟอร์ม OOS Input
          </button>
        </div>

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              title: "ประวัติการเยี่ยม",
              sub: "ตรวจสอบย้อนหลัง",
              icon: "fa-clock-rotate-left",
              color: "text-blue-400",
              bg: "from-zinc-800 to-zinc-900",
            },
            {
              title: "แก้ไขข้อมูล",
              sub: "ภายใน 15 นาที",
              icon: "fa-file-pen",
              color: "text-amber-400",
              bg: "from-zinc-800 to-zinc-900",
            },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={() => router.push("/my-history")}
              className={`bg-gradient-to-br ${btn.bg} border border-white/10 p-4 rounded-2xl text-left hover:border-white/30 transition-all active:scale-[0.98]`}
            >
              <div className={`${btn.color} text-base mb-2`}>
                <i className={`fa-solid ${btn.icon}`}></i>
              </div>
              <p className="text-[10px] font-black text-white">{btn.title}</p>
              <p className="text-[8px] text-zinc-400 font-bold">{btn.sub}</p>
            </button>
          ))}
        </div>

        {/* RECENT ACTIVITY */}
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/10 rounded-3xl p-5 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              ล่าสุด
            </h3>
            <button
              onClick={() => router.push("/my-history")}
              className="text-[9px] font-bold text-blue-400 underline"
            >
              ดูทั้งหมด
            </button>
          </div>

          {fetchingData ? (
            <div className="text-center py-4 text-[10px] text-zinc-600">
              กำลังดึงข้อมูล...
            </div>
          ) : (
            <div className="space-y-3">
              {myRecentVisits.slice(0, 3).map((visit: any) => (
                <div
                  key={visit.id}
                  className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors"
                >
                  <p className="text-[11px] font-bold text-zinc-200">
                    {visit.store_name}
                  </p>
                  <p className="text-[9px] font-mono text-zinc-500">
                    {visit.date_key}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="mt-12 mb-8 py-6 px-4 text-center bg-blue-600 text-white border-t-2 border-white rounded-t-3xl shadow-lg">
        <p className="text-[9px] font-black uppercase tracking-widest text-blue-900 mb-3">
          by FMBD CONTROLLER
        </p>
        <div className="space-y-1 mb-4">
          <p className="text-[14px] font-medium text-white-800">
            Niwat Wiyasing
          </p>
          <p className="text-[14px] font-medium text-red-800">
            Niwat_wiy@riverpro.co.th
          </p>
          <div className="flex justify-center gap-4 text-[10px] font-bold mt-2">
            <span className="flex items-center gap-1">
              <i className="fa-brands fa-line text-green-500"></i> niwatwi
            </span>
            <span className="flex items-center gap-1">
              <i className="fa-solid fa-phone text-blue-400"></i> 065-806-4694
            </span>
          </div>
        </div>
        <p className="text-[9px] opacity-50 border-t border-white/5 pt-4 mt-2">
          © 2026 Riverpro Intertrade Co., Ltd.
        </p>
      </footer>
    </div>
  );
}
