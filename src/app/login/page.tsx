"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { supabase } from "@/lib/supabase";
import {
  User,
  Lock,
  LogIn,
  Loader2,
  Mail,
  Phone,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSystemDown, setIsSystemDown] = useState(false); // 🟢 จับสถานะเซิร์ฟเวอร์ล่มเพื่อโชว์ป้ายเตือน

  useEffect(() => {
    const link: HTMLLinkElement =
      document.querySelector("link[rel*='icon']") ||
      document.createElement("link");
    link.type = "image/x-icon";
    link.rel = "shortcut icon";
    link.href = "/favicon.ico";
    document.getElementsByTagName("head")[0].appendChild(link);
    document.title = "เข้าสู่ระบบ | RVP Market Intelligence";
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      Swal.fire({
        icon: "warning",
        title: "กรุณากรอกข้อมูล",
        text: "โปรดระบุรหัสพนักงานและรหัสผ่านครับ",
        confirmButtonColor: "#1e3a8a",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // 🔍 1. พยายามตรวจสอบกับ Supabase ตามปกติก่อน
      const { data: user, error } = await supabase
        .from("user_profiles")
        .select("*")
        .or(`username.eq.${username.trim()},email.eq.${username.trim()}`)
        .eq("password_text", password.trim())
        .eq("is_active", true)
        .maybeSingle();

      // ถ้ารหัสผิดปกติแต่เซิร์ฟเวอร์ยังดีอยู่ จะดีดเป็นข้อความบอก
      if (error) throw error;
      if (!user) {
        Swal.fire({
          icon: "error",
          title: "เข้าสู่ระบบไม่สำเร็จ",
          text: "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง",
          confirmButtonColor: "#1e3a8a",
        });
        return;
      }

      // 🟢 กรณีล็อกอินปกติผ่านระบบกลาง
      localStorage.setItem("userCode", user.username);
      localStorage.setItem("userName", user.display_name);
      localStorage.setItem("companyTag", user.company_tag || "AUDITOR");

      Swal.fire({
        icon: "success",
        title: "เข้าสู่ระบบสำเร็จ",
        text: `ยินดีต้อนรับคุณ ${user.display_name}`,
        confirmButtonColor: "#1e3a8a",
        timer: 1500,
        showConfirmButton: false,
      }).then(() => {
        router.push("/");
      });
    } catch (err: any) {
      console.error("Login System Error:", err);

      // 🔓 2. แผนฉุกเฉิน: ถ้า Supabase บล็อก (503 / Connection Error) จะทะลวงด้วยเงื่อนไขนี้
      const isNetworkOr503Error =
        err.status === 503 ||
        err.message?.includes("fetch") ||
        err.message?.includes("connection");

      if (isNetworkOr503Error || err) {
        setIsSystemDown(true);

        // ดักเอาชื่อพนักงานจากช่องกรอกมาแปลงแทน (หากกรอกข้อมูลมา)
        const mockDisplayName = username.trim().toUpperCase();

        localStorage.setItem("userCode", username.trim());
        localStorage.setItem("userName", `พนักงานกองบิน [${mockDisplayName}]`);
        localStorage.setItem("companyTag", "RVP");

        await Swal.fire({
          icon: "warning",
          title: "เปิดประตูระบบสำรอง",
          text: "เนื่องจากระบบลงทะเบียนกลางขัดข้องชั่วคราว อนุญาตให้ท่านเข้าระบบผ่านโหมดเก็บข้อมูลในเครื่องมือถือได้ทันทีครับ",
          confirmButtonColor: "#d97706",
        });

        router.push("/checkin"); // เตะเข้าหน้าเช็คอินแบบ Offline (IndexedDB) ทันที
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white text-slate-800 rounded-3xl shadow-xl border-4 border-slate-900 p-6 space-y-6 relative overflow-hidden">
        {/* ป้ายเตือนโหมดฉุกเฉินจะโชว์ต่อเมื่อตรวจจับได้ว่าระบบล่ม */}
        {isSystemDown && (
          <div className="bg-amber-600 text-white p-2 text-center text-xs font-bold flex items-center justify-center gap-1.5 rounded-lg mb-2">
            <AlertTriangle className="w-4 h-4 animate-pulse" />{" "}
            ตรวจพบระบบกลางขัดข้อง เปิดโหมดเข้างานสำรอง
          </div>
        )}

        <div className="text-center space-y-2">
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-20 h-20 mx-auto flex items-center justify-center">
            <img
              src="/favicon.ico"
              alt="Icon Logo"
              className="h-14 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-wide pt-2">
            เข้าสู่ระบบ
          </h1>
          <p className="text-xs font-semibold text-red-700 tracking-wider uppercase">
            RVP Market Intelligence System
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 block">
              รหัสพนักงาน
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="กรอกรหัสพนักงานของท่าน"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 block">
              รหัสผ่าน / บันทึกฉุกเฉิน
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-slate-900 to-slate-800 hover:from-black hover:to-slate-900 text-white font-bold py-3.5 rounded-xl shadow-md active:scale-[0.99] transition-all text-sm tracking-wide mt-2 flex items-center justify-center space-x-2 disabled:opacity-75"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังยืนยันตัวตนสำรอง...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>เข้าสู่ระบบ</span>
              </>
            )}
          </button>
        </form>

        <div className="border-t border-slate-100 pt-4 text-center">
          <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider">
            By FMBD CONTROLLER
          </p>

          <div className="mt-3 flex flex-col items-center justify-center gap-1.5 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Contact:{" "}
                <span className="text-slate-900 font-bold">Niwat Wiyasing</span>
              </span>
            </div>
            <div className="flex items-center gap-1 text-blue-600 hover:underline">
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <a href="mailto:Niwat_wiy@riverpro.co.th">
                Niwat_wiy@riverpro.co.th
              </a>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-[11px]">
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-900" />
                <span>
                  Line ID:{" "}
                  <span className="text-slate-700 font-bold">niwatwi</span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-blue-500" />
                <span>
                  Tel:{" "}
                  <span className="text-slate-700 font-bold">065-806-4694</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-center text-slate-400 pt-2 opacity-80">
          © 2026 Riverpro Intertrade Co., Ltd. All rights reserved.
        </p>
      </div>
    </div>
  );
}
