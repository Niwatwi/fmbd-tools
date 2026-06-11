/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Swal from "sweetalert2";

export default function MyHistoryPage() {
  const router = useRouter();
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // ฟังก์ชันเช็คว่ายังแก้ได้ไหม (ภายใน 15 นาที)
  const isEditable = (createdAt: string) => {
    const createdDate = new Date(createdAt);
    const now = new Date();
    const diffInMinutes = (now.getTime() - createdDate.getTime()) / (1000 * 60);
    return diffInMinutes < 15;
  };

  const fetchMyHistory = useCallback(async () => {
    setLoading(true);
    const code = localStorage.getItem("userCode");

    // ดึงข้อมูล
    const { data, error } = await supabase
      .from("store_visits")
      .select(
        `
        id, created_at, store_name, 
        oos_items (id, descriptions, oos_reason, status)
      `,
      )
      .eq("auditor", code)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching history:", error);
      Swal.fire(
        "แจ้งเตือน",
        "ไม่สามารถดึงข้อมูลได้: " + error.message,
        "error",
      );
    } else {
      setHistoryData(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMyHistory();
  }, [fetchMyHistory]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-zinc-900 to-black font-sans antialiased p-4 pb-10 max-w-md mx-auto text-white">
      {/* ปุ่มกลับหน้าหลัก */}
      <button
        onClick={() => router.push("/auditor")}
        className="mb-6 flex items-center gap-2 text-[10px] font-black text-zinc-400 hover:text-white transition-all bg-zinc-800 px-4 py-2 rounded-full border border-white/10"
      >
        <i className="fa-solid fa-arrow-left"></i> กลับหน้าหลัก
      </button>

      <h2 className="text-sm font-black text-white mb-6 uppercase tracking-widest flex items-center gap-2">
        <i className="fa-solid fa-clock-rotate-left text-blue-400"></i>{" "}
        ประวัติงานของฉัน
      </h2>

      {loading ? (
        <div className="text-center py-10 animate-pulse text-xs text-zinc-500">
          กำลังโหลดข้อมูล...
        </div>
      ) : (
        <div className="space-y-4">
          {historyData.map((visit) => (
            <div
              key={visit.id}
              className="bg-zinc-900 border border-white/10 p-5 rounded-2xl shadow-lg relative"
            >
              <div className="flex justify-between mb-3 border-b border-white/5 pb-3">
                <span className="text-[11px] font-black text-blue-400 truncate">
                  {visit.store_name}
                </span>
                <span className="text-[9px] text-zinc-500 font-bold">
                  {new Date(visit.created_at).toLocaleString("th-TH")}
                </span>
              </div>

              <ul className="space-y-2">
                {visit.oos_items?.map((item: any, idx: number) => (
                  <li
                    key={idx}
                    className="flex justify-between items-center text-[10px] font-bold bg-white/5 p-2 rounded-lg"
                  >
                    <span className="text-zinc-300 truncate max-w-[70%]">
                      {item.descriptions}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] ${item.status === "approved" ? "bg-green-900/50 text-green-400" : "bg-amber-900/50 text-amber-400"}`}
                    >
                      {item.status || "Pending"}
                    </span>
                  </li>
                ))}
              </ul>

              {/* ปุ่มแก้ไขปรากฏเฉพาะภายใน 15 นาที */}
              {isEditable(visit.created_at) && (
                <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
                  <button
                    onClick={() => router.push(`/input/edit/${visit.id}`)}
                    className="text-[9px] font-black bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all"
                  >
                    แก้ไขข้อมูล (ภายใน 15 นาที)
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <footer className="mt-8 border-t border-slate-200 bg-white py-4 px-6 rounded-t-3xl text-center text-[10px] text-slate-500 font-medium space-y-1">
        <p className="font-black text-slate-700 text-xs tracking-tight">
          by FMBD CONTROLLER
        </p>
        <p className="font-black text-slate-800 text-sm">Niwat Wiyasing</p>
        <p className="text-[9px] text-slate-400 font-bold pt-1.5">
          © 2026 Riverpro Intertrade Co., Ltd. Central War Room Configuration.
        </p>
      </footer>
    </div>
  );
}
