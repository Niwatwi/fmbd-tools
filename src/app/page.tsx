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
} from "lucide-react";
import Swal from "sweetalert2";

export default function DashboardPage() {
  const router = useRouter();

  // System States
  const [currentTime, setCurrentTime] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginCode, setLoginCode] = useState("");

  // 🕒 1. ระบบนาฬิกาดิจิตอลสดอัปเดตวินาทีต่อวินาที
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

  // 🔒 2. เช็คตั๋วล็อกอินพนักงานเพื่อขึ้นยินดีต้อนรับบนแผงควบคุม
  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    const storedCode = localStorage.getItem("userCode");

    if (storedName) {
      setLoginName(storedName);
      setLoginCode(storedCode || "—");
    } else {
      // แผนความปลอดภัย: หากพนักงานยังไม่ได้ล็อกอิน ให้เด้งกลับไปหน้าล็อกอินโดยพลัน
      router.push("/login");
    }
  }, [router]);

  // 🚪 3. ฟังก์ชันการออกจากระบบอย่างปลอดภัย
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
      {/* HEADER BAR STYLE: MODERN 3D GLASSMORPHISM */}
      <header className="bg-blue-800/90 backdrop-blur-md border-b border-white/60 py-4 px-4 sticky top-0 z-50 shadow-[0_10px_30px_rgba(0,91,183,0.06)]">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          <div className="flex justify-between items-center">
            {/* แสดงป้ายบอกสถานะความปลอดภัยแบบโปร่งใส */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300 text-xs font-black shadow-inner">
              <ShieldCheck className="w-3.5 h-3.5" /> SECURE CONSOLE ACTIVE
            </div>

            {/* ปุ่มออกจากระบบดีไซน์หรู */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-rose-300 hover:text-white font-extrabold text-xs bg-rose-500/10 hover:bg-rose-600/30 border border-rose-500/20 px-3.5 py-2 rounded-xl backdrop-blur-sm transition-all active:translate-y-0.5"
            >
              <LogOut className="w-3.5 h-3.5" /> ออกจากระบบ
            </button>
          </div>

          <div className="flex items-center gap-3.5 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]">
            <img
              src="/rvp.png"
              alt="RVP Logo"
              className="w-12 h-12 object-contain drop-shadow-[0_4px_8px_rgba(255,255,255,0.2)] bg-white p-1 rounded-xl border border-slate-100"
            />
            <div className="flex-1">
              <h1 className="text-sm font-black text-white tracking-tight">
                Riverpro Intertrade Co., Ltd
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] font-black text-slate-200">
                <span className="text-blue-100 bg-blue-500/30 px-2 py-0.5 rounded-md border border-white/10 shadow-sm">
                  👤 ผู้ปฏิบัติงาน: {loginName || "กำลังตรวจสอบ..."} (
                  {loginCode})
                </span>
                <span className="text-amber-300 font-mono">
                  🕒 {currentTime}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-8">
        {/* แบนเนอร์ต้อนรับระบบปฏิบัติงานหน้าร้าน */}
        <section className="bg-white/90 border border-white/80 rounded-[30px] p-6 text-center space-y-3 shadow-[0_15px_30px_rgba(0,0,0,0.03)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 shadow-inner">
            <Compass
              className="w-6 h-6 text-blue-600 animate-spin"
              style={{ animationDuration: "8s" }}
            />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-black bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent">
              ระบบกองบินสำรวจตลาดหน้าร้าน (RVP Market Intelligence)
            </h2>
            <p className="text-xs text-slate-500 font-bold leading-relaxed max-w-lg mx-auto">
              ยินดีต้อนรับเข้าสู่แผงควบคุมระบบงานสนาม
              โปรดเลือกทำรายการบันทึกข้อมูลหน้าร้านด้านล่างนี้
              ข้อมูลทั้งหมดจะเชื่อมต่อระบบหลังบ้านเพื่อคำนวณ KPI และยิงออก LINE
              ทันทีครับพี่นิวาส
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------- */}
        {/* SECTION 1: DAILY FIELD OPERATIONS (งานสนามประจำวันหน้าร้าน) */}
        {/* ---------------------------------------------------- */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-6 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full"></div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              งานสนามประจำวันหน้าร้าน (Daily Store Operations)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 📍 การ์ดที่ 1: เช็คอินเริ่มปฏิบัติงาน (Check-In) */}
            <div
              onClick={() => router.push("/checkin")}
              className="group cursor-pointer bg-white/95 border border-white hover:border-amber-400 rounded-[28px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.02),4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-[0_15px_35px_rgba(245,158,11,0.15)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[220px] relative overflow-hidden"
            >
              <div className="absolute -right-6 -bottom-6 w-28 h-28 text-slate-100/50 group-hover:text-amber-100/50 transition-all duration-300 pointer-events-none">
                <MapPin className="w-full h-full" />
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(245,158,11,0.25)]">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                    เช็คอินปฏิบัติงานหน้าร้าน{" "}
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    บันทึกเวลาเข้าสถานที่ร้านค้าสาขา
                    สแกนพิกัดจีพีเอสผ่านดาวเทียมเพื่อยืนยันพิกัดประเมินและสะสมคะแนน
                    KPI ประจำทริป
                  </p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-50">
                <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100">
                  📍 ระบบติดตาม: check_in
                </span>
                <div className="flex items-center gap-1 text-xs font-black text-amber-600 group-hover:translate-x-1.5 transition-all">
                  เริ่มเช็คอินเข้าร้าน <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* 💰 การ์ดที่ 2: บันทึกข้อมูลสำรวจราคาตลาด (Add Price) */}
            <div
              onClick={() => router.push("/add-price")}
              className="group cursor-pointer bg-white/95 border border-white hover:border-emerald-400 rounded-[28px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.02),4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-[0_15px_35px_rgba(16,185,129,0.15)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[220px] relative overflow-hidden"
            >
              <div className="absolute -right-6 -bottom-6 w-28 h-28 text-slate-100/50 group-hover:text-emerald-100/50 transition-all duration-300 pointer-events-none">
                <Coins className="w-full h-full" />
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-emerald-400 to-teal-500 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(16,185,129,0.25)]">
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                    บันทึกข้อมูลสำรวจราคาตลาด{" "}
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    คีย์สำรวจราคาสินค้าปกติ/โปรโมชั่น
                    ถ่ายภาพป้ายราคาบนหิ้ง-รูปชั้นวาง คีย์ Off-take
                    และส่งข้อมูลสรุปอัตโนมัติแจ้งเตือนเข้าสู่กลุ่ม LINE
                  </p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-50">
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                  ⚡ ดำเนินการ: price_surveys
                </span>
                <div className="flex items-center gap-1 text-xs font-black text-emerald-600 group-hover:translate-x-1.5 transition-all">
                  บันทึกสำรวจราคา <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* 📋 การ์ดที่ 3: ประวัติการส่งรายงานของฉัน (My History) */}
            <div
              onClick={() => router.push("/my-history")}
              className="group cursor-pointer bg-white/95 border border-white hover:border-blue-400 rounded-[28px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.02),4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-[0_15_35px_rgba(59,130,246,0.15)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[220px] relative overflow-hidden"
            >
              <div className="absolute -right-6 -bottom-6 w-28 h-28 text-slate-100/50 group-hover:text-blue-100/50 transition-all duration-300 pointer-events-none">
                <History className="w-full h-full" />
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(59,130,246,0.25)]">
                  <ClipboardList className="w-6 h-6 text-white" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                    ประวัติสำรวจราคาย้อนหลัง
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    เปิดดูตารางสรุปรายการส่งข้อมูลเช็คราคา ยอดดึงหน้าร้านค้าสาขา
                    ตรวจสอบสถานะความเรียบร้อยของรายงานของตนเองแบบ Real-time
                  </p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-50">
                <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                  🔍 ตรวจสอบ: audit_logs
                </span>
                <div className="flex items-center gap-1 text-xs font-black text-blue-600 group-hover:translate-x-1.5 transition-all">
                  เปิดดูประวัติส่งงาน <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- */}
        {/* SECTION 2: MASTER DATABASE REGISTRY (การลงทะเบียนมาสเตอร์ดาต้า) */}
        {/* ---------------------------------------------------- */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-6 bg-gradient-to-b from-blue-600 to-indigo-700 rounded-full"></div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              ลงทะเบียนระบบฐานข้อมูลกลางมาสเตอร์ (Database Registry)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 🏬 การ์ดที่ 4: ลงทะเบียนร้านค้า Master Store */}
            <div
              onClick={() => router.push("/add-stores")}
              className="group cursor-pointer bg-white/95 border border-white hover:border-blue-300 rounded-[28px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.02),4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-[0_15px_35px_rgba(6,10,248,0.1)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[220px] relative overflow-hidden"
            >
              <div className="absolute -right-6 -bottom-6 w-28 h-28 text-slate-100/50 group-hover:text-blue-100/50 transition-all duration-300 pointer-events-none">
                <Store className="w-full h-full" />
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-600 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(6,10,248,0.2)]">
                  <Store className="w-6 h-6 text-amber-300" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    ลงทะเบียนร้านค้า Master Store{" "}
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    ขึ้นทะเบียนพิกัดสาขาร้านค้า (MT/TT),
                    จับค่าพิกัดพาดตำแหน่งสดผ่านดาวเทียม
                    และส่งแนบภาพถ่ายหน้าร้านประกอบเพื่อสรุปรายงานลงฐานข้อมูลระบบ
                  </p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-50">
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-150">
                  🚀 ท่อเชื่อมต่อตาราง: stores
                </span>
                <div className="flex items-center gap-1 text-xs font-black text-blue-600 group-hover:translate-x-1.5 transition-all">
                  ลงทะเบียนสาขาใหม่ <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* 📦 การ์ดที่ 5: ลงทะเบียนสินค้า Master Product */}
            <div
              onClick={() => router.push("/add-products")}
              className="group cursor-pointer bg-white/95 border border-white hover:border-indigo-300 rounded-[28px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.02),4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-[0_15px_35px_rgba(6,10,248,0.1)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[220px] relative overflow-hidden"
            >
              <div className="absolute -right-6 -bottom-6 w-28 h-28 text-slate-100/50 group-hover:text-indigo-100/50 transition-all duration-300 pointer-events-none">
                <Package className="w-full h-full" />
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(99,102,241,0.2)]">
                  <Package className="w-6 h-6 text-pink-300" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    ลงทะเบียนสินค้า Master Product{" "}
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    สแกนบาร์โค้ดขึ้นหิ้งสินค้า, บันทึกแยกคลังด้วย Dropdown
                    แบรนด์คู่แข่ง, พร้อมจำแนกสถานะการตลาด (NPD/OPD)
                    ออกรายงานด่วนวิเคราะห์กลยุทธ์ตลาด
                  </p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-50">
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-150">
                  🚀 ท่อเชื่อมต่อตาราง: products
                </span>
                <div className="flex items-center gap-1 text-xs font-black text-indigo-600 group-hover:translate-x-1.5 transition-all">
                  ขึ้นรูปสินค้ามาสเตอร์ <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* แผงข้อกำหนดและข้อมูลช่วยเหลือด่วนด้านล่าง */}
        <section className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-[28px] p-5 text-white space-y-3.5 shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <Database className="w-4 h-4 text-blue-400" />
            <h4 className="text-xs font-black uppercase tracking-wider text-blue-300">
              ข้อควรปฏิบัติของพนักงานสำรวจตลาดหน้าร้าน (User Manual)
            </h4>
          </div>
          <ul className="text-[11px] text-slate-300 font-bold space-y-2 list-disc pl-4 leading-relaxed">
            <li>
              โปรดกดยอมรับสิทธิ์การเข้าถึงพิกัดผ่าน Safari/Chrome เสมอ
              เพื่อล็อกเวลาและจุดละติจูดขณะที่น้องๆ ยิงป้ายราคาที่หน้าร้านสาขา
            </li>
            <li>
              การสลับปุ่มเป็น <span className="text-orange-400">🔥 NPD</span>{" "}
              ในหน้าสินค้ามาสเตอร์
              จะเป็นการส่งรายการวิเคราะห์สินค้าแบรนด์คู่แข่งชนิดใหม่เข้ารายงานการตลาดทันทีครับ
            </li>
            <li>
              หากพบปัญหาการใช้กล้องในการสแกนบาร์โค้ด
              สามารถพิมพ์ป้อนตัวเลขเลขใต้แท่งบาร์โค้ดสินค้าได้โดยตรงโดยกดปุ่มค้นหาได้เช่นกัน
            </li>
          </ul>
        </section>
      </main>

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
