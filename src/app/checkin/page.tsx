/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { supabase } from "@/lib/supabase";
import {
  MapPin,
  Camera,
  User,
  Home,
  Loader2,
  LogIn,
  LogOut,
} from "lucide-react";

interface StoreData {
  id: number;
  area: string;
  mer_code: string;
  chanel: string;
  account: string;
  store_name: string;
  province: string;
  region: string;
  store_code: string;
  store_img: string;
  store_type: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  is_active: boolean;
}

export default function CheckinPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentTime, setCurrentTime] = useState("");
  const [stores, setStores] = useState<StoreData[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [isCheckIn, setIsCheckIn] = useState(false);
  const [isCheckOut, setIsCheckOut] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // สเตทสำหรับ Dropdown Chanel และ Account
  const [selectedChanel, setSelectedChanel] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");

  const [deviceLat, setDeviceLat] = useState<number | null>(null);
  const [deviceLng, setDeviceLng] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState("กำลังตรวจสอบสิทธิ์ GPS...");
  const [isGpsReady, setIsGpsReady] = useState(false);

  const [userCode, setUserCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [companyTag, setCompanyTag] = useState("");

  const [showIosLineWarning, setShowIosLineWarning] = useState(false);

  const triggerCamera = () => {
    fileInputRef.current?.click();
  };

  const uploadImageToStorage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `attendance/${userCode}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("attendance-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("attendance-images")
        .getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err) {
      console.error("Upload failed:", err);
      return null;
    }
  };

  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus("เบราว์เซอร์ไม่รองรับ GPS");
      return;
    }

    setIsGpsReady(false);
    setGpsStatus("กำลังจับพิกัดดาวเทียม...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDeviceLat(position.coords.latitude);
        setDeviceLng(position.coords.longitude);
        setGpsStatus("ยืนยันพิกัดเรียบร้อย");
        setIsGpsReady(true);
      },
      (error) => {
        setIsGpsReady(false);
        const ua = navigator.userAgent.toLowerCase();
        const isLine = ua.includes("line");
        const isIOS = /iphone|ipad|ipod/.test(ua);

        if (isLine && isIOS) {
          setGpsStatus("❌ แอป LINE บล็อกพิกัดบน iOS");
          setShowIosLineWarning(true);
        } else if (error.code === error.PERMISSION_DENIED) {
          setGpsStatus(
            "❌ ถูกปฏิเสธสิทธิ์เข้าถึงตำแหน่ง (โปรดเปิดสิทธิ์ใน Setting)",
          );
        } else {
          setGpsStatus("❌ ไม่สามารถจับพิกัดได้ (โปรดเช็คสัญญาณ GPS)");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };

  useEffect(() => {
    fetchCurrentLocation();
    const storedUsername = localStorage.getItem("userCode") || "";
    const storedName = localStorage.getItem("userName") || "ไม่ระบุชื่อพนักงาน";
    const storedTag = localStorage.getItem("companyTag") || "AUDITOR";

    setUserCode(storedUsername);
    setDisplayName(storedName);
    setCompanyTag(storedTag.toUpperCase());

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
    const clockInterval = setInterval(updateClock, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    const getSupabaseStores = async () => {
      try {
        setIsLoadingStores(true);
        const { data, error } = await supabase
          .from("stores")
          .select("*")
          .order("store_name", { ascending: true });
        if (error) throw error;
        if (data) setStores(data as StoreData[]);
      } catch (err: any) {
        console.error("Error fetching stores:", err.message);
      } finally {
        setIsLoadingStores(false);
      }
    };
    getSupabaseStores();
  }, []);

  // 🟢 ลอจิกหัวใจสำคัญ: กรองร้านค้า 100% ตามที่ต้องการ
  const baseStores = stores.filter((store) => {
    if (!userCode) return false;
    if (companyTag.includes("ADMIN")) return true;

    const cleanUserCode = userCode.trim().toUpperCase();
    const firstLetter = cleanUserCode.charAt(0);

    // 📌 กฎ 1: รหัส M ดึงตาม mer_code
    if (firstLetter === "M") {
      return store.mer_code?.toUpperCase() === cleanUserCode;
    }
    // 📌 กฎ 2: รหัส C (Commando) ดึงตาม Area ของหัวหน้า (K)
    // ตัวอย่าง: C08001 -> ตัดมาแค่ 08 -> ต่อกับ K กลายเป็น K08
    else if (firstLetter === "C") {
      const managerArea = "K" + cleanUserCode.substring(1, 3); // ได้ค่า "K08"
      return store.area?.toUpperCase() === managerArea;
    }
    // 📌 กฎ 3: รหัส K, B ดึงตาม Area ตัวเองตรงๆ (เช่น K08 -> ดึง Area K08)
    else if (["K", "B"].includes(firstLetter)) {
      return store.area?.toUpperCase() === cleanUserCode;
    }

    return store.mer_code?.toUpperCase() === cleanUserCode;
  });

  // สร้างตัวเลือก Dropdown สำหรับ Chanel และ Account
  const uniqueChanels = Array.from(
    new Set(baseStores.map((s) => s.chanel).filter(Boolean)),
  );

  const uniqueAccounts = Array.from(
    new Set(
      baseStores
        .filter((s) => !selectedChanel || s.chanel === selectedChanel)
        .map((s) => s.account)
        .filter(Boolean),
    ),
  );

  const displayedStores = baseStores.filter(
    (store) =>
      (!selectedChanel || store.chanel === selectedChanel) &&
      (!selectedAccount || store.account === selectedAccount),
  );

  const handleSubmitCallVisit = async () => {
    if (!selectedStore)
      return Swal.fire({ icon: "warning", title: "กรุณาเลือกร้านค้า" });
    if (!isCheckIn && !isCheckOut)
      return Swal.fire({ icon: "warning", title: "ระบุสถานะงาน" });
    if (!isGpsReady)
      return Swal.fire({
        icon: "error",
        title: "ยังไม่ได้พิกัด GPS",
        text: "โปรดรอให้ระบบจับตำแหน่งสำเร็จ หรือเปิดผ่าน Safari บน iOS",
      });
    if (!imageFile)
      return Swal.fire({
        icon: "warning",
        title: "กรุณาถ่ายรูป",
        text: "ต้องแนบรูปถ่ายการปฏิบัติงานครับ",
      });

    try {
      setIsSubmitting(true);
      const publicUrl = await uploadImageToStorage(imageFile);
      if (!publicUrl) throw new Error("ไม่สามารถอัปโหลดรูปภาพได้");

      const currentStore = stores.find((s) => s.id === parseInt(selectedStore));
      if (!currentStore) throw new Error("ไม่พบข้อมูลร้านค้า");

      const { error } = await supabase.from("attendance_logs").insert([
        {
          username: userCode,
          display_name: displayName,
          company_tag: companyTag,
          type: isCheckIn ? "check-in" : "check-out",
          latitude: deviceLat,
          longitude: deviceLng,
          image_url: publicUrl,
          created_at: new Date().toISOString(),

          store_id: currentStore.id,
          store_name: currentStore.store_name,
          store_code: currentStore.store_code,
          store_area: currentStore.area,

          store_chanel: currentStore.chanel,
          store_account: currentStore.account,
          store_province: currentStore.province,
          store_region: currentStore.region,
          store_img: currentStore.store_img,
          store_type: currentStore.store_type,
          store_address: currentStore.address,
          store_phone: currentStore.phone,
          store_lat: currentStore.lat,
          store_lng: currentStore.lng,
        },
      ]);

      if (error) throw error;

      Swal.fire({
        icon: "success",
        title: "บันทึกข้อมูลสำเร็จ",
        timer: 2000,
        showConfirmButton: false,
      }).then(() => {
        setSelectedStore("");
        setIsCheckIn(false);
        setIsCheckOut(false);
        setImagePreview(null);
        setImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#bbf5eb] font-sans pb-12 relative">
      <header className="bg-gradient-to-r from-[#1e3a8a] via-[#0f172a] to-[#1e293b] text-white shadow-lg border-b border-blue-900/40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center space-x-3 text-center sm:text-left">
            <div className="bg-white p-1.5 rounded-xl shadow-md">
              <img src="/favicon.ico" className="h-10 w-auto" alt="logo" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Check-in Portal</h1>
              <p className="text-xs text-slate-300">{currentTime}</p>
            </div>
          </div>
          <button
            onClick={() => router.push("/")}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
          >
            <Home className="w-3.5 h-3.5" /> กลับหน้าหลัก
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 space-y-4 py-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">
              ผู้รายงานตัว ({userCode || "กำลังโหลด..."})
            </p>
            <h3 className="text-base font-bold text-slate-800">
              {displayName}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select
              value={selectedChanel}
              onChange={(e) => {
                setSelectedChanel(e.target.value);
                setSelectedAccount("");
                setSelectedStore("");
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold outline-none focus:border-blue-500 transition-all"
            >
              <option value="">-- Chanel --</option>
              {uniqueChanels.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={selectedAccount}
              onChange={(e) => {
                setSelectedAccount(e.target.value);
                setSelectedStore("");
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold outline-none focus:border-blue-500 transition-all"
            >
              <option value="">-- Account --</option>
              {uniqueAccounts.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {isLoadingStores ? (
            <div className="text-center py-3 text-xs text-slate-500 flex items-center justify-center gap-1.5 bg-slate-50 rounded-xl border border-slate-100">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />{" "}
              กำลังประมวลผลข้อมูลสาขา...
            </div>
          ) : (
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-blue-500 transition-all"
            >
              <option value="">
                เลือกร้านค้าที่ได้รับมอบหมาย ({displayedStores.length})
              </option>
              {displayedStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.store_name} [{s.store_code}]
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setIsCheckIn(true);
              setIsCheckOut(false);
            }}
            className={`p-4 rounded-2xl border transition-all ${isCheckIn ? "bg-blue-50 border-blue-300 text-blue-600 shadow-sm" : "bg-white hover:border-blue-200"}`}
          >
            <LogIn className="w-6 h-6 mx-auto" />
            <span className="text-xs font-bold block mt-1">Check-in</span>
          </button>
          <button
            onClick={() => {
              setIsCheckOut(true);
              setIsCheckIn(false);
            }}
            className={`p-4 rounded-2xl border transition-all ${isCheckOut ? "bg-emerald-50 border-emerald-300 text-emerald-600 shadow-sm" : "bg-white hover:border-emerald-200"}`}
          >
            <LogOut className="w-6 h-6 mx-auto" />
            <span className="text-xs font-bold block mt-1">Check-out</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleImageCapture}
            className="hidden"
          />
          <div
            onClick={triggerCamera}
            className="border-2 border-dashed h-40 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 rounded-xl hover:border-blue-400 overflow-hidden transition-all"
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                className="h-full w-full object-contain"
                alt="preview"
              />
            ) : (
              <>
                <Camera className="w-8 h-8 text-slate-400" />
                <span className="text-xs font-bold text-slate-600 mt-2">
                  ถ่ายภาพปฏิบัติงานจริงหน้าสาขา
                </span>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            สถานะตรวจสอบพิกัด (GPS)
          </label>
          <div
            className={`rounded-xl p-3 flex items-start space-x-2.5 border transition-all ${isGpsReady ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}
          >
            <div
              className={`p-1 rounded-lg text-white mt-0.5 ${isGpsReady ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}
            >
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div>
              <p
                className={`text-xs font-bold ${isGpsReady ? "text-emerald-700" : "text-amber-700"}`}
              >
                {gpsStatus}
              </p>
              {isGpsReady && (
                <p className="text-[10px] text-emerald-600 font-mono mt-0.5">
                  Lat: {deviceLat?.toFixed(5)}, Lng: {deviceLng?.toFixed(5)}
                </p>
              )}
            </div>
          </div>
          {!isGpsReady && (
            <button
              onClick={fetchCurrentLocation}
              className="w-full text-[10px] bg-slate-100 hover:bg-slate-200 py-1.5 rounded-lg font-bold text-slate-600 transition-all"
            >
              🔄 เรียกซ้ำตำแหน่งพิกัดดาวเทียม
            </button>
          )}
        </div>

        <button
          onClick={handleSubmitCallVisit}
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-4 rounded-2xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 animate-spin" />}
          {isSubmitting
            ? "กำลังอัปโหลดและบันทึกข้อมูล..."
            : "บันทึกข้อมูลการเข้าปฏิบัติงาน (Call Visit)"}
        </button>
      </main>

      <footer className="py-5 text-center text-[10px] text-slate-400 font-bold">
        &copy; 2026 RIVERPRO INTERTRADE CO., LTD.
      </footer>

      {showIosLineWarning && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6 text-white text-center animate-fadeIn">
          <div className="absolute top-4 right-4 animate-bounce text-right">
            <p className="text-sm font-black text-amber-400">กดตรงนี้ครับ ↗</p>
            <p className="text-xs text-slate-300">จุดสามจุดมุมขวาบน</p>
          </div>

          <div className="max-w-sm space-y-5 mt-12">
            <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              <MapPin className="w-8 h-8 text-white animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-amber-400">
                ระบบเปิดผ่าน LINE Browser (iOS)
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed px-4">
                เพื่อความเสถียรในการทำงานและระบบดาวเทียม GPS โปรดย้ายไปเปิดบน
                Safari ก่อนเข้าเช็คอินครับ
              </p>
            </div>

            <div className="bg-white/10 border border-white/10 rounded-2xl p-4 text-left space-y-3">
              <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                💡 วิธีการย้ายเบราว์เซอร์:
              </p>
              <ol className="text-xs text-slate-200 space-y-2 list-decimal list-inside font-semibold">
                <li>
                  มองไปที่{" "}
                  <span className="text-amber-400 font-bold">มุมขวาบนสุด</span>{" "}
                  ของหน้าจอมือถือ
                </li>
                <li>
                  กดปุ่ม{" "}
                  <span className="bg-white/20 px-1.5 py-0.5 rounded font-black">
                    ⋮
                  </span>{" "}
                  หรือ{" "}
                  <span className="bg-white/20 px-1.5 py-0.5 rounded font-black">
                    ...
                  </span>
                </li>
                <li>
                  เลือกคำสั่ง{" "}
                  <span className="text-emerald-400 font-bold">
                    "เปิดใน Safari" (Open in Safari)
                  </span>
                </li>
              </ol>
            </div>

            <p className="text-[11px] text-slate-400 font-medium pt-4">
              เมื่อย้ายไป Safari แล้ว หน้าต่างนี้จะหายไปและบันทึกพิกัดได้ 100%
              ครับ
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
