/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  ShieldCheck,
  MapPin,
  Coins,
  History,
  AlertTriangle,
  UserCog,
} from "lucide-react";
import Swal from "sweetalert2";

const _supabase = createClient(
  "https://ryqabfpzjmtujfhslovm.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5cWFiZnB6am10dWpmaHNsb3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NjE2ODEsImV4cCI6MjA5MjUzNzY4MX0.D2DKpUHQgZmcc_XCTa1wbV0Yak9HCGy1OJHptpQFato",
);

export default function DashboardPage() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
    const storedName =
      localStorage.getItem("userName") ||
      localStorage.getItem("username") ||
      "";
    const storedCode =
      localStorage.getItem("userCode") ||
      localStorage.getItem("usercode") ||
      "";

    if (storedName) {
      setDisplayName(storedName);
      const adminUsers = ["admin", "admin_niwat"];
      setIsAdmin(
        adminUsers.includes(storedName.toLowerCase()) ||
          storedCode === "FMBD03",
      );
      setIsLoading(false);
    } else {
      router.push("/login");
    }
  }, [router]);

  const handleSignOut = () => {
    Swal.fire({
      title: "ออกจากระบบ?",
      text: "ยืนยันการออกจากเซสชันนี้ครับพี่?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "ออกจากระบบ",
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.clear();
        router.push("/login");
      }
    });
  };

  if (isLoading)
    return (
      <div className="min-h-screen bg-blue-900 flex items-center justify-center text-white">
        กำลังโหลด...
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#060af8] via-[#efb2eb] to-[#E8EFF5] font-sans pb-16 text-slate-800">
      <header className="bg-blue-800/90 backdrop-blur-md border-b border-white/60 py-4 px-4 sticky top-0 z-50 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 rounded-xl text-emerald-300 text-xs font-black border border-emerald-400/30">
            <ShieldCheck className="w-3.5 h-3.5" /> ระบบปลอดภัย
          </div>
          <button
            onClick={handleSignOut}
            className="text-rose-300 font-black text-xs bg-rose-500/10 px-3.5 py-2 rounded-xl border border-rose-500/20"
          >
            ออกจากระบบ
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-8">
        <div className="bg-white p-6 rounded-[28px] shadow-sm">
          <p className="text-lg font-black">{displayName}</p>
          <p className="text-xs text-slate-400 font-medium">
            Niwat_wiy@riverpro.co.th
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-sm font-black text-slate-900 uppercase">
            งานสนามประจำวัน
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              onClick={() => router.push("/checkin")}
              className="cursor-pointer bg-white rounded-[28px] p-6 shadow-md hover:border-amber-400 border-2 transition-all"
            >
              <MapPin className="w-8 h-8 text-amber-500 mb-2" />
              <h3 className="text-sm font-black">เช็คอินปฏิบัติงาน</h3>
            </div>
            <div
              onClick={() => router.push("/add-price")}
              className="cursor-pointer bg-white rounded-[28px] p-6 shadow-md hover:border-emerald-400 border-2 transition-all"
            >
              <Coins className="w-8 h-8 text-emerald-500 mb-2" />
              <h3 className="text-sm font-black">บันทึกราคา</h3>
            </div>
            <div
              onClick={() => router.push("/my-history")}
              className="cursor-pointer bg-white rounded-[28px] p-6 shadow-md hover:border-blue-400 border-2 transition-all"
            >
              <History className="w-8 h-8 text-blue-500 mb-2" />
              <h3 className="text-sm font-black">ประวัติงาน</h3>
            </div>
          </div>
        </section>

        {isAdmin && (
          <section className="space-y-4 bg-slate-900 p-6 rounded-[30px] border-2 border-rose-500">
            <h2 className="text-sm font-black text-white uppercase">
              แผงควบคุมแอดมิน
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div
                onClick={() => router.push("/admin-users")}
                className="cursor-pointer bg-rose-50 rounded-[28px] p-6 border-2 border-rose-200 hover:border-rose-500 transition-all"
              >
                <UserCog className="w-8 h-8 text-rose-600 mb-2" />
                <h3 className="text-sm font-black">Admin Management</h3>
              </div>
              <div
                onClick={() => router.push("/oos-warroom")}
                className="cursor-pointer bg-rose-50 rounded-[28px] p-6 border-2 border-rose-200 hover:border-rose-500 transition-all"
              >
                <AlertTriangle className="w-8 h-8 text-rose-600 mb-2" />
                <h3 className="text-sm font-black">OOS Warroom</h3>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
