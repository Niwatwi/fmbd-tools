/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import {
  ArrowLeft,
  Store,
  MapPin,
  Save,
  RefreshCw,
  Trash2,
  ShieldCheck,
  Mail,
  Phone,
  Image as ImageIcon,
  Compass,
  ChevronDown,
} from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-blue-800 via-zinc-200 to-zinc-50 font-sans antialiased pb-10">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
      />

      {/* HEADER: Gradient Glass + Logo Section */}
      <div className="bg-gradient-to-br from-blue-600 to-zinc-200/60 backdrop-blur-2xl border-b border-white/10 p-6 pt-10 rounded-b-[2.5rem] shadow-2xl">
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
              className="mb-3 flex items-center gap-1.5 text-[9px] font-bold text-white hover:text-blue-400 transition-all bg-green-800 px-3 py-1 rounded-lg border border-white/5"
            >
              <i className="fa-solid fa-home"></i> กลับหน้าหลัก
            </button>
            <p className="text-white text-lg font-black drop-shadow-lg">
              {displayName}
            </p>
            <p className="text-amber-700 text-[12px] font-bold">
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
                  <p className="text-[9px] font-mono text-white">
                    {visit.date_key}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="max-w-4xl mx-auto px-4 mt-20 text-center space-y-6 pb-12 font-sans text-slate-600">
        {/* เส้นคั่นบนขอบเขตเนื้อหาไล่เฉดสีอย่างนุ่มนวล */}
        <div className="bg-gradient-to-r from-transparent via-slate-300 to-transparent h-[1px] w-full"></div>

        {/* บล็อกการ์ดข้อมูลผู้ควบคุมระบบสไตล์ Minimal Professional */}
        <div className="flex flex-col items-center justify-center gap-4 bg-white/50 backdrop-blur-md border border-white/70 p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.01)] max-w-lg mx-auto transition-all hover:border-blue-200">
          {/* ฝั่งหัวข้อตำแหน่งควบคุมงาน */}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-blue-700">
              <ShieldCheck className="w-4 h-4 text-blue-600 animate-pulse" />
              <h4 className="text-[10px] font-black tracking-[0.15em] uppercase">
                FMBD CONTROLLER
              </h4>
            </div>
            <h3 className="text-sm font-black text-slate-800 tracking-tight">
              Niwat Wiyasing
            </h3>
          </div>

          {/* ช่องทางการติดต่อฝังไอคอน Interactive ลิงก์กดโทรออก/ส่งเมล์ได้ทันที */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-x-5 gap-y-2 text-xs font-bold text-slate-500">
            {/* ✉️ ส่งอีเมล */}
            <a
              href="mailto:Niwat_wiy@riverpro.co.th"
              className="flex items-center gap-1.5 hover:text-blue-600 transition-colors bg-white/60 px-3 py-1.5 rounded-xl border border-slate-200/50 hover:border-blue-300 shadow-xs"
            >
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-600">
                Niwat_wiy@riverpro.co.th
              </span>
            </a>

            {/* 📞 โทรศัพท์ */}
            <a
              href="tel:0658064694"
              className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors bg-white/60 px-3 py-1.5 rounded-xl border border-slate-200/50 hover:border-emerald-300 shadow-xs"
            >
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-600">065-806-4694</span>
            </a>
          </div>
        </div>

        {/* บรรทัดประกาศลิขสิทธิ์ระดับองค์กร */}
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] pt-2">
          © {new Date().getFullYear()} Riverpro Intertrade Co., Ltd. All Rights
          Reserved.
        </p>
      </footer>
    </div>
  );
}
