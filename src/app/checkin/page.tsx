//Checkin/page
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
  Store,
  CheckCircle2,
  Home,
  Trash2,
  Loader2,
  Filter,
  RotateCw,
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

  const [selectedChanel, setSelectedChanel] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");

  const [deviceLat, setDeviceLat] = useState<number | null>(null);
  const [deviceLng, setDeviceLng] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState("กำลังตรวจสอบสิทธิ์ GPS...");
  const [isGpsReady, setIsGpsReady] = useState(false);

  const [userCode, setUserCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [companyTag, setCompanyTag] = useState("");

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
        // เพิ่ม Error Handling เพื่อให้รู้ว่าติดที่ Permission หรือ timeout
        if (error.code === error.PERMISSION_DENIED) {
          setGpsStatus(
            "❌ ถูกปฏิเสธสิทธิ์เข้าถึงตำแหน่ง (โปรดเปิดสิทธิ์ใน Setting)",
          );
        } else {
          setGpsStatus("❌ ไม่สามารถจับพิกัดได้ (โปรดเช็คสัญญาณ GPS)");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  useEffect(() => {
    fetchCurrentLocation();
    const storedUsername = localStorage.getItem("userCode") || "M00000";
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

  const baseStores = stores.filter((store) => {
    const cleanUserCode = userCode.trim().toUpperCase();
    if (companyTag.includes("ADMIN")) return true;
    if (cleanUserCode.startsWith("M"))
      return store.mer_code?.toUpperCase() === cleanUserCode;
    return true;
  });

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
        text: "โปรดรอให้ระบบจับตำแหน่งสำเร็จก่อนครับ",
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
          store_id: currentStore.id,
          store_name: currentStore.store_name,
          store_code: currentStore.store_code,
          store_area: currentStore.area,
          created_at: new Date().toISOString(),
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
    <div className="min-h-screen bg-[#bbf5eb] font-sans pb-12">
      <header className="bg-gradient-to-r from-[#1e3a8a] via-[#0f172a] to-[#1e293b] text-white shadow-lg border-b border-blue-900/40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center space-x-3 text-center sm:text-left">
            <div className="bg-white p-1.5 rounded-xl shadow-md">
              <img src="/favicon.ico" className="h-10 w-auto" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Check-in Portal</h1>
              <p className="text-xs text-slate-300">{currentTime}</p>
            </div>
          </div>
          <button
            onClick={() => router.push("/")}
            className="px-3 py-2 bg-white/10 rounded-xl text-xs font-bold flex items-center gap-1"
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
              ผู้รายงานตัว ({userCode})
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
              onChange={(e) => setSelectedChanel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold"
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
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold"
            >
              <option value="">-- Account --</option>
              {uniqueAccounts.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm"
          >
            <option value="">เลือกร้านค้า ({displayedStores.length})</option>
            {displayedStores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.store_name} [{s.store_code}]
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setIsCheckIn(true);
              setIsCheckOut(false);
            }}
            className={`p-4 rounded-2xl border ${isCheckIn ? "bg-blue-50 border-blue-300 text-blue-600" : "bg-white"}`}
          >
            <LogIn className="w-6 h-6 mx-auto" />{" "}
            <span className="text-xs font-bold">Check-in</span>
          </button>
          <button
            onClick={() => {
              setIsCheckOut(true);
              setIsCheckIn(false);
            }}
            className={`p-4 rounded-2xl border ${isCheckOut ? "bg-emerald-50 border-emerald-300 text-emerald-600" : "bg-white"}`}
          >
            <LogOut className="w-6 h-6 mx-auto" />{" "}
            <span className="text-xs font-bold">Check-out</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageCapture}
            className="hidden"
          />
          <div
            onClick={triggerCamera}
            className="border-2 border-dashed h-40 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 rounded-xl hover:border-blue-400"
          >
            {imagePreview ? (
              <img src={imagePreview} className="h-full object-contain" />
            ) : (
              <>
                <Camera className="w-8 h-8 text-slate-400" />
                <span className="text-xs font-bold text-slate-600 mt-2">
                  ถ่ายภาพปฏิบัติงาน
                </span>
              </>
            )}
          </div>
        </div>

        {/* 🟢 บล็อกแสดง GPS สถานะ */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            สถานะ GPS
          </label>
          <div
            className={`rounded-xl p-3 flex items-start space-x-2.5 border ${isGpsReady ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}
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
                <p className="text-[10px] text-emerald-600">
                  Lat: {deviceLat?.toFixed(5)}, Lng: {deviceLng?.toFixed(5)}
                </p>
              )}
            </div>
          </div>
          {!isGpsReady && (
            <button
              onClick={fetchCurrentLocation}
              className="w-full text-[10px] bg-slate-100 py-1 rounded-lg font-bold text-slate-600"
            >
              ลองจับพิกัดใหม่
            </button>
          )}
        </div>

        <button
          onClick={handleSubmitCallVisit}
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold"
        >
          {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล Call Visit"}
        </button>
      </main>

      <footer className="py-5 text-center text-[10px] text-slate-400">
        &copy; 2026 RIVERPRO INTERTRADE CO., LTD.
      </footer>
    </div>
  );
}
