/* eslint-disable @next/next/no-img-element */
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
  Clock,
  Home,
  LogOut,
  MessageSquare,
  PenTool,
} from "lucide-react";
import Swal from "sweetalert2";

interface VisitData {
  id: string;
  store_name: string;
  date_key: string;
  auditor: string;
  auditor_reply?: string;
  cma_image?: string;
}

export default function AuditorPage() {
  const router = useRouter();
  const [auditorCode, setAuditorCode] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [fetchingData, setFetchingData] = useState<boolean>(true);
  const [myRecentVisits, setMyRecentVisits] = useState<VisitData[]>([]);
  const [currentTime, setCurrentTime] = useState<string>("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentVisit, setCurrentVisit] = useState<VisitData | null>(null);
  const [remarkText, setRemarkText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchDashboardData = useCallback(async (code: string) => {
    setFetchingData(true);
    const { data, error } = await supabase
      .from("store_visits")
      .select(
        `
    id, 
    store_name, 
    date_key, 
    auditor, 
    created_at, 
    area, 
    store_code, 
    chanel, 
    account, 
    province, 
    region, 
    auditor_type, 
    auditor_reply, 
    comment_text
  `,
      )
      .eq("auditor", code)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!error && data) setMyRecentVisits(data as VisitData[]);
    setFetchingData(false);
  }, []);

  const handleSaveAction = async () => {
    if (!currentVisit) return;
    setIsSaving(true);

    // อัปเดตข้อมูลลงฐานข้อมูล
    const { error } = await supabase
      .from("store_visits")
      .update({
        auditor_reply: remarkText, // คอลัมน์ที่พี่สร้างใหม่
        // ถ้าพี่ต้องการเก็บ comment จากบอร์ดด้วย (ถ้ามี) ก็ใส่เพิ่มตรงนี้
      })
      .eq("id", currentVisit.id);

    if (!error) {
      Swal.fire({
        icon: "success",
        title: "บันทึกการแก้ไขสำเร็จ",
        timer: 1500,
      });
      setIsModalOpen(false);
      fetchDashboardData(auditorCode); // โหลดข้อมูลใหม่
    } else {
      Swal.fire({
        icon: "error",
        title: "บันทึกข้อมูลล้มเหลว",
        text: error.message,
      });
    }
    setIsSaving(false);
  };

  const handleGoHome = () => {
    router.push("/");
  };

  const handleLogout = () => {
    localStorage.removeItem("userCode");
    localStorage.removeItem("userName");
    // ปรับเปลี่ยนจาก /login เป็น / เพื่อกลับหน้าหลักครับ
    router.push("/");
  };

  useEffect(() => {
    const timer = setInterval(
      () => setCurrentTime(new Date().toLocaleTimeString("th-TH")),
      1000,
    );
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const code = localStorage.getItem("userCode");
    const name = localStorage.getItem("userName") || "พนักงาน";
    if (!code) router.push("/login");
    else {
      setAuditorCode(code);
      setDisplayName(name);
      fetchDashboardData(code);
    }
  }, [router, fetchDashboardData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 via-zinc-200 to-zinc-50 font-sans antialiased pb-10">
      {/* HEADER */}
      <div className="bg-gradient-to-br from-blue-600 to-zinc-200/60 backdrop-blur-2xl border-b border-white/10 p-6 pt-10 rounded-b-[2.5rem] shadow-2xl">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-white text-lg font-black">{displayName}</p>
            <p className="text-amber-300 text-[10px] font-bold">
              ID: {auditorCode}
            </p>
          </div>
          <div className="text-right text-white">
            <div className="text-xl font-mono font-black">{currentTime}</div>
            <button
              onClick={handleGoHome} // เปลี่ยนจาก handleLogout เป็น handleGoHome
              className="text-blue-700 text-[10px] font-bold underline"
            >
              กลับหน้าหลัก
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-4 mt-6 space-y-6">
        <button
          onClick={() => router.push("/input")}
          className="w-full py-4 bg-white text-indigo-700 font-black text-xs rounded-2xl shadow-xl"
        >
          เปิดฟอร์ม OOS Input
        </button>

        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-5 shadow-lg">
          <h3 className="text-[10px] font-black text-zinc-400 uppercase mb-4">
            กิจกรรมล่าสุด
          </h3>
          {fetchingData ? (
            <p className="text-zinc-600 text-xs text-center">กำลังโหลด...</p>
          ) : (
            <div className="space-y-3">
              {myRecentVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="flex justify-between items-center bg-zinc-800 p-3 rounded-xl border border-white/5"
                >
                  <span className="text-xs font-bold text-white">
                    {visit.store_name}
                  </span>
                  <button
                    onClick={() => {
                      setCurrentVisit(visit);
                      setRemarkText(visit.auditor_reply || "");
                      setIsModalOpen(true);
                    }}
                    className="bg-blue-600 text-white p-2 rounded-lg"
                  >
                    <PenTool className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl">
            <h3 className="font-black text-sm mb-4">บันทึกแผนการแก้ไข</h3>

            {/* 🟢 จุดที่เพิ่ม: แสดงข้อความจากบอร์ดบริหาร */}
            {currentVisit?.auditor_reply && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-3 mb-4">
                <p className="text-[10px] font-bold text-amber-800 uppercase">
                  ข้อความจากบอร์ดบริหาร:
                </p>
                <p className="text-xs text-slate-700 mt-1">
                  {/* ใส่ code ดึงข้อความมาโชว์ตรงนี้ */}
                </p>
              </div>
            )}

            <textarea
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              className="w-full h-24 border rounded-xl p-3 text-xs mb-4"
              placeholder="พิมพ์คำชี้แจงหรือแผนการแก้ไข..."
            />

            {/* ส่วนแนบรูปภาพพี่เพิ่มตรงนี้ได้เลย */}
            <input type="file" className="text-[10px] mb-4" />

            <div className="flex gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2 bg-zinc-200 rounded-lg text-xs font-black"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveAction}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-black"
              >
                {isSaving ? "บันทึก..." : "บันทึกข้อมูล"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
