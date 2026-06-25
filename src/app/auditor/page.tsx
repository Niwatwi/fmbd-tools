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
  AlertTriangle,
  Send,
  Camera,
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

interface UrgentComment {
  id: number;
  created_at: string;
  store_name: string;
  customer_name: string;
  comment_text: string;
  status: string;
  company: string;
  auditor: string | null;
}

export default function AuditorPage() {
  const router = useRouter();
  const [auditorCode, setAuditorCode] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [fetchingData, setFetchingData] = useState<boolean>(true);
  const [myRecentVisits, setMyRecentVisits] = useState<VisitData[]>([]);
  const [currentTime, setCurrentTime] = useState<string>("");

  // 🚨 States สำหรับระบบแจ้งเตือน Customer Comments
  const [urgentComments, setUrgentComments] = useState<UrgentComment[]>([]);
  const [fetchingComments, setFetchingComments] = useState<boolean>(true);
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});
  const [replyFiles, setReplyFiles] = useState<Record<number, File | null>>({}); // สเตตเก็บไฟล์รูปแยกราย ID
  const [submittingReplyId, setSubmittingReplyId] = useState<number | null>(
    null,
  );

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentVisit, setCurrentVisit] = useState<VisitData | null>(null);
  const [remarkText, setRemarkText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // ดึงข้อมูลกิจกรรมล่าสุดจาก store_visits
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

  // ฟังก์ชันคิวรีข้อมูลข้อความร้องเรียนจากบอร์ดผู้บริหารแบบมี Fallback Match ร้านค้า
  const fetchUrgentComments = useCallback(
    async (auditorName: string, code: string) => {
      if (!auditorName || !code) return;
      setFetchingComments(true);

      try {
        const { data: visits } = await supabase
          .from("store_visits")
          .select("store_name")
          .eq("auditor", code);

        const myStoreNames = Array.from(
          new Set(visits?.map((v) => v.store_name) || []),
        );

        const { data: comments, error } = await supabase
          .from("oos_comments")
          .select("*")
          .eq("status", "pending")
          .order("id", { ascending: false });

        if (!error && comments) {
          const filtered = comments.filter((comment: any) => {
            const isMyNameDirectly = comment.auditor === auditorName;
            const isMyStoreWhenNameIsEmpty =
              !comment.auditor && myStoreNames.includes(comment.store_name);
            return isMyNameDirectly || isMyStoreWhenNameIsEmpty;
          });
          setUrgentComments(filtered as UrgentComment[]);
        }
      } catch (err) {
        console.error("Error fetching comments fallback:", err);
      } finally {
        setFetchingComments(false);
      }
    },
    [],
  );

  // 🚨 ฟังก์ชันส่งคำชี้แจง + อัปโหลดรูปพรูฟหน้าร้าน (เวอร์ชันดักจับ Error ละเอียด)
  const handleSendCommentReply = async (commentId: number) => {
    const text = replyTexts[commentId]?.trim();
    const file = replyFiles[commentId];

    if (!text) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาพิมพ์คำชี้แจงก่อนส่งครับ",
        confirmButtonColor: "#d97706",
      });
      return;
    }

    setSubmittingReplyId(commentId);
    let uploadedImageUrl = null;

    try {
      // 1. กระบวนการอัปโหลดรูปภาพ
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${commentId}_${Date.now()}.${fileExt}`;
        const filePath = `replies/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("oos-images")
          .upload(filePath, file, {
            contentType: file.type || "image/png",
            cacheControl: "3600",
            upsert: true, // 🟢 เปลี่ยนเป็น true เพื่อให้อนุญาตเขียนไฟล์ทับได้แบบไร้รอยต่อครับพี่
          });

        // 💥 ถ้าระบบ Storage พัง ให้พ่นแจ้งเตือนละเอียดออกมาดูทันที
        if (uploadError) {
          throw new Error(`[Storage Error] ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("oos-images").getPublicUrl(filePath);

        uploadedImageUrl = publicUrl;
      }

      // 2. อัปเดตข้อมูลลงตาราง oos_comments
      const { error: updateError } = await supabase
        .from("oos_comments")
        .update({
          auditor_reply: text,
          reply_image_url: uploadedImageUrl,
          status: "auditor_replied",
          auditor: displayName,
        })
        .eq("id", commentId);

      // 💥 ถ้าตาราง Database พัง ให้พ่นแจ้งเตือนละเอียดออกมาดูทันที
      if (updateError) {
        throw new Error(`[Database Error] ${updateError.message}`);
      }

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "ส่งพรูฟงานและคำชี้แจงเข้า War Room สำเร็จ! 🎉",
        showConfirmButton: false,
        timer: 2500,
      });

      setReplyTexts((prev) => {
        const u = { ...prev };
        delete u[commentId];
        return u;
      });
      setReplyFiles((prev) => {
        const u = { ...prev };
        delete u[commentId];
        return u;
      });
      setUrgentComments((prev) => prev.filter((item) => item.id !== commentId));
    } catch (err: any) {
      // 🟢 แสดง Error จริงจากระบบคลาวด์ ไม่ต้องเดาอาการ
      Swal.fire({
        icon: "error",
        title: "บันทึกข้อมูลไม่สำเร็จ",
        text: err.message,
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setSubmittingReplyId(null);
    }
  };

  const handleSaveAction = async () => {
    if (!currentVisit) return;
    setIsSaving(true);

    const { error } = await supabase
      .from("store_visits")
      .update({
        auditor_reply: remarkText,
      })
      .eq("id", currentVisit.id);

    if (!error) {
      Swal.fire({ icon: "success", title: "บันทึกสำเร็จ", timer: 1500 });
      setIsModalOpen(false);
      fetchDashboardData(auditorCode);
    } else {
      Swal.fire({ icon: "error", title: "ล้มเหลว", text: error.message });
    }
    setIsSaving(false);
  };

  const handleGoHome = () => {
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
      fetchUrgentComments(name, code);
    }
  }, [router, fetchDashboardData, fetchUrgentComments]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 via-zinc-200 to-zinc-50 font-sans antialiased pb-10">
      {/* HEADER */}
      <div className="bg-gradient-to-br from-blue-600 to-zinc-200/60 backdrop-blur-2xl border-b border-white/10 p-6 pt-10 rounded-b-[2.5rem] shadow-2xl">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-white text-lg font-black">{displayName}</h2>
            <p className="text-amber-300 text-[10px] font-bold">
              ID: {auditorCode}
            </p>
          </div>
          <div className="text-right text-white">
            <div className="text-xl font-mono font-black">{currentTime}</div>
            <button
              onClick={handleGoHome}
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
          className="w-full py-4 bg-green-600 text-white font-black text-xs rounded-2xl shadow-xl hover:bg-zinc-50 transition-colors"
        >
          เปิดฟอร์ม OOS Input
        </button>

        {/* 🚨 แผงแจ้งเตือนแบบ All-In-One: รวมช่องข้อความและแนบภาพไว้ในที่เดียวกัน */}
        {!fetchingComments && urgentComments.length > 0 && (
          <div className="bg-white border-l-4 border-amber-500 rounded-2xl p-5 shadow-xl text-left">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="text-amber-600 shrink-0" size={18} />
              <h3 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                งานร้องเรียนเร่งด่วนจากผู้บริหาร ({urgentComments.length}{" "}
                รายการ)
              </h3>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {urgentComments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-2"
                >
                  <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold">
                    <span className="text-blue-700">
                      📍 {comment.store_name}
                    </span>
                    <span className="bg-zinc-200 text-zinc-700 px-1.5 py-0.5 rounded font-mono">
                      {comment.company}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-700 font-medium bg-white p-2.5 rounded-lg border border-zinc-100 leading-relaxed">
                    <span className="font-bold text-rose-600">
                      ข้อความสั่งการ:
                    </span>{" "}
                    {comment.comment_text}
                  </p>

                  <div className="space-y-2 pt-1">
                    {/* ช่องป้อนคำชี้แจง */}
                    <input
                      type="text"
                      placeholder="พิมพ์คำชี้แจงหรือมาตรการแก้ไขหน้าร้าน..."
                      value={replyTexts[comment.id] || ""}
                      className="w-full bg-white text-xs border border-zinc-300 rounded-lg px-3 py-2.5 outline-none focus:border-amber-500 font-medium shadow-sm"
                      onChange={(e) =>
                        setReplyTexts({
                          ...replyTexts,
                          [comment.id]: e.target.value,
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          handleSendCommentReply(comment.id);
                      }}
                    />

                    {/* แผงปุ่มอัปโหลดรูปภาพและปุ่มส่งพรูฟงาน */}
                    <div className="flex justify-between items-center gap-2 bg-white border border-zinc-200 p-2 rounded-lg shadow-sm">
                      <div className="flex items-center gap-1.5 overflow-hidden w-full">
                        <Camera size={14} className="text-zinc-400 shrink-0" />
                        <input
                          type="file"
                          accept="image/*"
                          className="text-[10px] text-zinc-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9px] file:font-black file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer w-full"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setReplyFiles({
                              ...replyFiles,
                              [comment.id]: file,
                            });
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        disabled={submittingReplyId === comment.id}
                        onClick={() => handleSendCommentReply(comment.id)}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg disabled:bg-zinc-300 transition-colors shrink-0 font-black text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <span>ส่งพรูฟงาน</span>
                        <Send
                          size={11}
                          className={
                            submittingReplyId === comment.id
                              ? "animate-spin"
                              : ""
                          }
                        />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* กิจกรรมล่าสุด */}
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
                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-500 transition-colors"
                  >
                    <PenTool className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL (คงไว้เผื่อแก้ไขบันทึกงานเช็คอินย้อนหลังทั่วไป) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl">
            <h3 className="font-black text-sm mb-4">บันทึกแผนการแก้ไข</h3>

            {currentVisit?.auditor_reply && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-3 mb-4 text-left">
                <p className="text-[10px] font-bold text-amber-800 uppercase">
                  ประวัติบันทึกข้อมูลล่าสุด:
                </p>
                <p className="text-xs text-slate-700 mt-1">
                  {currentVisit.auditor_reply}
                </p>
              </div>
            )}

            <textarea
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              className="w-full h-24 border rounded-xl p-3 text-xs mb-4 outline-none focus:border-blue-500"
              placeholder="พิมพ์คำชี้แจงหรือแผนการแก้ไข..."
            />

            <input type="file" className="text-[10px] mb-4 w-full" />

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
