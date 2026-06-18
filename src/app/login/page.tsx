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
  MapPin,
  Copy,
  CheckCircle2,
  Globe, // 🟢 เพิ่มไอคอนสำหรับเบราว์เซอร์
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showIosLineWarning, setShowIosLineWarning] = useState(false);

  useEffect(() => {
    const link: HTMLLinkElement =
      document.querySelector("link[rel*='icon']") ||
      document.createElement("link");
    link.type = "image/x-icon";
    link.rel = "shortcut icon";
    link.href = "/favicon.ico";
    document.getElementsByTagName("head")[0].appendChild(link);
    document.title = "เข้าสู่ระบบ | RVP Market Intelligence";

    const ua = navigator.userAgent.toLowerCase();
    const isLine = ua.includes("line");
    const isIOS = /iphone|ipad|ipod/.test(ua);

    if (isLine && isIOS) {
      setShowIosLineWarning(true);
    }
  }, []);

  // 🟢 ฟังก์ชันสำหรับคัดลอกลิงก์ (สำหรับ Safari หรือกรณีฉุกเฉิน)
  const handleCopyLink = () => {
    const currentUrl = window.location.href;
    navigator.clipboard
      .writeText(currentUrl)
      .then(() => {
        Swal.fire({
          icon: "success",
          title: "คัดลอกลิงก์สำเร็จ!",
          text: "กรุณาเปิดแอป Safari แล้ววางลิงก์นี้เพื่อเข้าใช้งานครับ",
          confirmButtonColor: "#10b981",
          timer: 3000,
        });
      })
      .catch(() => {
        Swal.fire({
          icon: "error",
          title: "คัดลอกไม่สำเร็จ",
          text: "โปรดกดที่จุด 3 จุดมุมขวาบน เพื่อเลือกเปิดในเบราว์เซอร์ด้วยตนเองครับ",
        });
      });
  };

  // 🟢 ฟังก์ชันสำหรับบังคับเปิดแอปเบราว์เซอร์ภายนอก (Custom URL Scheme)
  const handleOpenExternalApp = (browserType: string) => {
    const currentUrl = window.location.href;
    let targetUrl = "";

    if (browserType === "chrome") {
      // Chrome ใช้ googlechromes:// สำหรับ https
      targetUrl = currentUrl
        .replace(/^https:\/\//i, "googlechromes://")
        .replace(/^http:\/\//i, "googlechrome://");
    } else if (browserType === "edge") {
      // Edge ใช้ microsoft-edge-https://
      targetUrl = currentUrl
        .replace(/^https:\/\//i, "microsoft-edge-https://")
        .replace(/^http:\/\//i, "microsoft-edge-http://");
    } else if (browserType === "firefox") {
      // Firefox ใช้ firefox://open-url?url=
      targetUrl = `firefox://open-url?url=${encodeURIComponent(currentUrl)}`;
    }

    if (targetUrl) {
      // สั่งเปลี่ยน URL เพื่อให้ iOS สลับแอป
      window.location.href = targetUrl;
    }
  };

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

      const { data: user, error } = await supabase
        .from("user_profiles")
        .select("*")
        .or(`username.eq.${username.trim()},email.eq.${username.trim()}`)
        .eq("password_text", password.trim())
        .eq("is_active", true)
        .maybeSingle();

      if (error || !user) {
        throw new Error("รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง");
      }

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
      console.error("Login Error:", err.message);
      Swal.fire({
        icon: "error",
        title: "เข้าสู่ระบบไม่สำเร็จ",
        text: "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง",
        confirmButtonColor: "#1e3a8a",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center p-4 font-sans relative">
      <div className="w-full max-w-md bg-gradient-to-br from-blue-900 to-white text-white rounded-3xl shadow-xl border-4 border-red-200 p-1 space-y-6 relative overflow-hidden">
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
          <p className="text-xs font-semibold text-red-900 tracking-wider uppercase">
            RVP Market Intelligence System
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 px-4">
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
              รหัสผ่าน
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
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-md active:scale-[0.99] transition-all text-sm tracking-wide mt-2 flex items-center justify-center space-x-2 disabled:opacity-75"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังยืนยันตัวตน...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>เข้าสู่ระบบ</span>
              </>
            )}
          </button>
        </form>

        <div className="border-t border-slate-100 pt-4 pb-4 text-center px-4">
          <p className="text-[11px] font-bold text-red-800 uppercase tracking-wider">
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

        <p className="text-[10px] text-center text-blue-900 pb-4 opacity-80">
          © 2026 Riverpro Intertrade Co., Ltd. All rights reserved.
        </p>
      </div>

      {/* 🍏 หน้าต่างแจ้งเตือนสำหรับพนักงานที่ใช้ iPhone บนแอป LINE */}
      {showIosLineWarning && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[9999] flex flex-col items-center p-6 text-white text-center animate-fadeIn overflow-y-auto">
          <div className="max-w-sm space-y-4 mt-8 w-full pb-8">
            <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              <MapPin className="w-8 h-8 text-white animate-pulse" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-amber-400">
                ระบบถูกจำกัดบนแอป LINE (iOS)
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed px-2">
                กรุณาเลือกเปิดระบบในแอปเบราว์เซอร์ด้านล่างนี้
                <br />
                เพื่อให้ GPS และกล้องทำงานได้ 100% ครับ
              </p>
            </div>

            {/* 🟢 ส่วนของปุ่มบังคับเปิดเบราว์เซอร์ภายนอก */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleOpenExternalApp("chrome")}
                className="w-full bg-white hover:bg-slate-100 text-slate-800 font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                <Globe className="w-5 h-5 text-red-500" /> เปิดด้วย Google
                Chrome
              </button>

              <button
                onClick={() => handleOpenExternalApp("edge")}
                className="w-full bg-white hover:bg-slate-100 text-slate-800 font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                <Globe className="w-5 h-5 text-blue-600" /> เปิดด้วย Microsoft
                Edge
              </button>

              <button
                onClick={() => handleOpenExternalApp("firefox")}
                className="w-full bg-white hover:bg-slate-100 text-slate-800 font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                <Globe className="w-5 h-5 text-orange-500" /> เปิดด้วย Firefox
              </button>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-600"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold">
                หรือสำหรับผู้ใช้ Safari
              </span>
              <div className="flex-grow border-t border-slate-600"></div>
            </div>

            {/* 🟢 ปุ่มคัดลอกลิงก์สำหรับ Safari เพราะ Apple บล็อกไม่ให้มีปุ่มบังคับเปิด Safari โดยตรง */}
            <div className="space-y-2">
              <button
                onClick={handleCopyLink}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                <Copy className="w-5 h-5" /> คัดลอกลิงก์ (นำไปวางใน Safari)
              </button>

              <button
                onClick={() => setShowIosLineWarning(false)}
                className="w-full bg-transparent hover:bg-slate-800 text-slate-400 font-bold py-3 rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all mt-2"
              >
                <CheckCircle2 className="w-4 h-4" /> ปิดหน้าต่างนี้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
