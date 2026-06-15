/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  Package,
  Compass,
  LogOut,
  ShieldCheck,
  Mail,
  Phone,
  ChevronRight,
  Sparkles,
  Database,
  MapPin,
  Coins,
  History,
  ClipboardList,
  BarChart3,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import Swal from "sweetalert2";

export default function DashboardPage() {
  const router = useRouter();

  const [currentTime, setCurrentTime] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginCode, setLoginCode] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString("th-TH", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }) + " น.",
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    const storedCode = localStorage.getItem("userCode");
    if (storedName) {
      setLoginName(storedName);
      setLoginCode(storedCode || "—");
    } else {
      router.push("/login");
    }
  }, [router]);

  const handleSignOut = () => {
    Swal.fire({
      title: "ยืนยันการออกจากระบบ?",
      text: "คุณต้องการออกจากเซสชันการปฏิบัติงานนี้หรือไม่ครับพี่?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "ออกจากระบบทันที",
      cancelButtonText: "ยกเลิก",
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.clear();
        router.push("/login");
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#060af8] via-[#efb2eb] to-[#E8EFF5] font-sans pb-16 text-slate-800">
      {/* HEADER BAR */}
      <header className="bg-blue-800/90 backdrop-blur-md border-b border-white/60 py-4 px-4 sticky top-0 z-50 shadow-[0_10px_30px_rgba(0,91,183,0.06)]">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300 text-xs font-black shadow-inner">
              <ShieldCheck className="w-3.5 h-3.5" /> SECURE CONSOLE ACTIVE
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-rose-300 hover:text-white font-extrabold text-xs bg-rose-500/10 hover:bg-rose-600/30 border border-rose-500/20 px-3.5 py-2 rounded-xl backdrop-blur-sm transition-all"
            >
              <LogOut className="w-3.5 h-3.5" /> Out / Sign Off
            </button>
          </div>
          <div className="flex items-center gap-3.5 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
            <img
              src="/rvp.png"
              alt="RVP Logo"
              className="w-12 h-12 object-contain bg-white p-1 rounded-xl border border-slate-100"
            />
            <div className="flex-1">
              <h1 className="text-sm font-black text-white tracking-tight">
                Riverpro Intertrade Co., Ltd
              </h1>
              <div className="text-[11px] font-black text-slate-200 mt-1">
                👤 {loginName || "กำลังตรวจสอบ..."} ({loginCode}) • 🕒{" "}
                {currentTime}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-8">
        {/* SECTION 1: FIELD OPERATIONS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-6 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full"></div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              FBMD TOOLS
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              onClick={() => router.push("/checkin")}
              className="group cursor-pointer bg-white/95 border border-white hover:border-amber-400 rounded-[28px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:-translate-y-1 transition-all flex flex-col justify-between min-h-[220px]"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black text-slate-800">
                  Checkin - Checkout
                </h3>
              </div>
            </div>
            <div
              onClick={() => router.push("/add-price")}
              className="group cursor-pointer bg-white/95 border border-white hover:border-emerald-400 rounded-[28px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:-translate-y-1 transition-all flex flex-col justify-between min-h-[220px]"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center">
                  <Coins className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black text-slate-800">
                  Price and Off_take Check
                </h3>
              </div>
            </div>
            <div
              onClick={() => router.push("/my-history")}
              className="group cursor-pointer bg-white/95 border border-white hover:border-blue-400 rounded-[28px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:-translate-y-1 transition-all flex flex-col justify-between min-h-[220px]"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black text-slate-800">OOS Check</h3>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: ANALYTICS & COMMENTS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-6 bg-gradient-to-b from-purple-500 to-indigo-600 rounded-full"></div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Dashboard Analyze
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              onClick={() => router.push("/dashboard-price-report")}
              className="group cursor-pointer bg-white/95 border border-white hover:border-blue-500 rounded-[28px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:-translate-y-1 transition-all flex flex-col justify-between min-h-[220px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-slate-800">
                Price Analyze
              </h3>
            </div>
            <div
              onClick={() => router.push("/dashboard-oos-report")}
              className="group cursor-pointer bg-white/95 border border-white hover:border-orange-500 rounded-[28px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:-translate-y-1 transition-all flex flex-col justify-between min-h-[220px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-slate-800">
                OOS Alert System
              </h3>
            </div>

            {/* 🟢 ปุ่ม Active: ศูนย์ตอบกลับคอมเมนต์ลูกค้า */}
            <div
              onClick={() => router.push("/customer-comment")}
              className="group cursor-pointer bg-white/95 border border-white hover:border-blue-400 rounded-[28px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_15px_35px_rgba(59,130,246,0.15)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[220px] relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                    Customer Service Center
                    <span className="text-[9px] bg-emerald-500 text-white font-extrabold px-1.5 py-0.5 rounded-full animate-pulse">
                      LIVE
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    A live chat room that listens to questions and complaints
                    from store branch customers Real-time
                  </p>
                </div>
              </div>
              <div className="pt-4 flex items-center justify-between border-t border-slate-50">
                <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                  🚀 Status: ACTIVE
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: MASTER DATABASE */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-6 bg-gradient-to-b from-blue-600 to-indigo-700 rounded-full"></div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Registering Center
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              onClick={() => router.push("/add-stores")}
              className="group cursor-pointer bg-white/95 border border-white hover:border-blue-300 rounded-[28px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:-translate-y-1 transition-all flex flex-col justify-between min-h-[220px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-slate-800">
                Add Master Store
              </h3>
            </div>
            <div
              onClick={() => router.push("/add-products")}
              className="group cursor-pointer bg-white/95 border border-white hover:border-indigo-300 rounded-[28px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:-translate-y-1 transition-all flex flex-col justify-between min-h-[220px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-slate-800">
                Add Master Product
              </h3>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="max-w-4xl mx-auto px-4 mt-20 text-center text-slate-600 pb-12">
        <p className="text-[10px] font-black uppercase tracking-[0.12em]">
          © {new Date().getFullYear()} Riverpro Intertrade Co., Ltd. All Rights
          Reserved.
        </p>
      </footer>
    </div>
  );
}
